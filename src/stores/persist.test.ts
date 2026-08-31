import { describe, it, expect, vi } from 'vitest';
import { createStore } from 'zustand/vanilla';
import { hydrate, persistSlice, persistSlices } from './persist';
import { DB, onDbChange } from '../lib/db';

/**
 * This layer is the reason the Phase 3 store refactor did not destroy anyone's
 * data, so it is worth pinning.
 *
 * The decision it encodes: zustand's own `persist` middleware wraps values as
 * `{ state, version }`. `lib/cloud.ts` sweeps every `gequ_*` key RAW and ships
 * it to the server as-is, so adopting the middleware would have changed the
 * on-disk format for every existing user and every other device already holding
 * their data. These tests assert the format stays byte-compatible.
 */

type S = { a: number[]; b: string[]; bump: () => void; touchB: () => void };

const makeStore = () => createStore<S>(set => ({
    a: [],
    b: [],
    bump: () => set(s => ({ a: [...s.a, s.a.length] })),
    touchB: () => set(s => ({ b: [...s.b, 'x'] })),
}));

describe('hydrate', () => {
    it('returns the fallback when the key is absent', () => {
        expect(hydrate('missing', ['default'])).toEqual(['default']);
    });

    it('reads an existing value written before the refactor existed', () => {
        // Exactly what an existing user's browser holds: a bare JSON array.
        localStorage.setItem('gequ_kanban', JSON.stringify([{ id: 1, text: 'старая задача' }]));
        expect(hydrate('kanban', [])).toEqual([{ id: 1, text: 'старая задача' }]);
    });

    it('falls back rather than throwing on corrupted JSON', () => {
        localStorage.setItem('gequ_kanban', '{not json');
        expect(hydrate('kanban', [])).toEqual([]);
    });

    it('falls back when the stored value is literal null', () => {
        localStorage.setItem('gequ_kanban', 'null');
        expect(hydrate('kanban', ['fallback'])).toEqual(['fallback']);
    });
});

describe('persistSlice', () => {
    it('writes the bare value, with no wrapper envelope', () => {
        // The assertion that matters. If this ever becomes `{"state":…,"version":…}`
        // then cloud sync ships a different shape than every other device expects.
        const store = makeStore();
        persistSlice(store, 'a', s => s.a);
        store.getState().bump();

        const raw = localStorage.getItem('gequ_a')!;
        expect(raw).toBe('[0]');
        expect(JSON.parse(raw)).toEqual([0]);
        expect(raw).not.toContain('state');
        expect(raw).not.toContain('version');
    });

    it('does not write until something actually changes', () => {
        const store = makeStore();
        persistSlice(store, 'a', s => s.a);
        expect(localStorage.getItem('gequ_a')).toBeNull();
    });

    it('leaves neighbouring keys alone when one slice changes', () => {
        // A change in one domain must not rewrite another's key: cloud sync
        // pushes on every write, so a spurious write is a spurious upload and
        // a chance to clobber a newer value from another device.
        const store = makeStore();
        persistSlices(store, { a: s => s.a, b: s => s.b });
        store.getState().bump();

        expect(localStorage.getItem('gequ_a')).toBe('[0]');
        expect(localStorage.getItem('gequ_b')).toBeNull();
    });

    it('compares by reference, so an unrelated update does not rewrite the slice', () => {
        const store = makeStore();
        persistSlice(store, 'a', s => s.a);
        store.getState().bump();

        const writes = vi.fn();
        const off = onDbChange(writes);
        store.getState().touchB();      // touches b, not a
        off();

        expect(writes).not.toHaveBeenCalled();
    });

    it('mirrors every subsequent change', () => {
        const store = makeStore();
        persistSlice(store, 'a', s => s.a);
        store.getState().bump();
        store.getState().bump();
        expect(JSON.parse(localStorage.getItem('gequ_a')!)).toEqual([0, 1]);
    });
});

describe('round trip', () => {
    it('a value written by the store rehydrates identically', () => {
        const store = makeStore();
        persistSlice(store, 'a', s => s.a);
        store.getState().bump();
        store.getState().bump();

        expect(hydrate('a', [])).toEqual(store.getState().a);
    });

    it('a value written by the OLD code path rehydrates identically', () => {
        // The migration case: data written before stores existed must load
        // unchanged, because nothing rewrites it.
        const legacy = [{ id: 1, name: 'привычка', history: ['2026-08-01'] }];
        DB.save('habits', legacy);
        expect(hydrate('habits', [])).toEqual(legacy);
    });
});

describe('DB.save resilience', () => {
    it('does not throw when storage rejects the write', () => {
        // Private-browsing mode and a full quota both throw here. Losing a
        // write is survivable; taking the app down with it is not.
        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });
        expect(() => DB.save('a', [1, 2, 3])).not.toThrow();
        spy.mockRestore();
    });

    it('notifies listeners so cloud sync learns there is something to push', () => {
        const seen = vi.fn();
        const off = onDbChange(seen);
        DB.save('a', [1]);
        off();
        expect(seen).toHaveBeenCalledTimes(1);
    });

    it('stops notifying after unsubscribe', () => {
        const seen = vi.fn();
        onDbChange(seen)();
        DB.save('a', [1]);
        expect(seen).not.toHaveBeenCalled();
    });
});
