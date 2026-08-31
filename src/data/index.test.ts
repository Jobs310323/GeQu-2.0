import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { repository, initStorage } from './index';
import { openDb, idbGet, idbKeys } from './migrate';

/**
 * The dual-write property: every write reaches BOTH stores, so switching which
 * one seeds reads is a one-line change and rolling back costs nothing.
 *
 * If these ever fail, IndexedDB is silently behind localStorage — which looks
 * like nothing at all until the day reads move over, and then looks like
 * catastrophic data loss.
 */

beforeEach(async () => {
    localStorage.clear();
    globalThis.indexedDB = new IDBFactory();
});

describe('reads', () => {
    it('returns the fallback when a key is absent', () => {
        expect(repository.get('missing', ['default'])).toEqual(['default']);
    });

    it('reads what was written', () => {
        repository.set('kanban', [{ id: 1 }]);
        expect(repository.get('kanban', [])).toEqual([{ id: 1 }]);
    });

    it('falls back rather than throwing on corrupt JSON', () => {
        localStorage.setItem('gequ_kanban', '{not json');
        expect(repository.get('kanban', [])).toEqual([]);
    });

    it('lists keys without the prefix', () => {
        repository.set('kanban', []);
        repository.set('logs', []);
        expect(repository.keys().sort()).toEqual(['kanban', 'logs']);
    });
});

describe('dual write', () => {
    it('mirrors a write into IndexedDB once storage is initialised', async () => {
        await initStorage();
        repository.set('kanban', [{ id: 1, text: 'задача' }]);

        // The mirror is fire-and-forget, so let the microtask queue drain.
        await new Promise(r => setTimeout(r, 20));

        const db = await openDb();
        expect(await idbGet(db, 'gequ_kanban')).toBe(localStorage.getItem('gequ_kanban'));
        db.close();
    });

    it('mirrors a removal', async () => {
        await initStorage();
        repository.set('kanban', [{ id: 1 }]);
        await new Promise(r => setTimeout(r, 20));
        repository.remove('kanban');
        await new Promise(r => setTimeout(r, 20));

        const db = await openDb();
        expect(await idbGet(db, 'gequ_kanban')).toBeUndefined();
        db.close();
    });

    it('catches up writes made before the mirror opened', async () => {
        // initStorage is not awaited by the app, so the user can be typing
        // before IndexedDB is open. Without a catch-up pass, a first session's
        // early work would never reach IDB at all.
        repository.set('kanban', [{ id: 1, text: 'до открытия' }]);
        repository.set('logs', [{ id: 2 }]);

        await initStorage();

        const db = await openDb();
        expect(await idbGet(db, 'gequ_kanban')).toBe(localStorage.getItem('gequ_kanban'));
        expect(await idbGet(db, 'gequ_logs')).toBe(localStorage.getItem('gequ_logs'));
        db.close();
    });

    it('keeps working when IndexedDB is unavailable', async () => {
        vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new DOMException('SecurityError'); });
        await initStorage();

        expect(() => repository.set('kanban', [{ id: 1 }])).not.toThrow();
        expect(repository.get('kanban', [])).toEqual([{ id: 1 }]);
        vi.restoreAllMocks();
    });

    it('does not mirror keys that are not ours', async () => {
        localStorage.setItem('unrelated', 'x');
        await initStorage();
        const db = await openDb();
        expect(await idbKeys(db)).not.toContain('unrelated');
        db.close();
    });
});

describe('write notifications', () => {
    it('notifies subscribers so cloud sync learns there is something to push', () => {
        const seen = vi.fn();
        const off = repository.subscribe(seen);
        repository.set('kanban', []);
        off();
        expect(seen).toHaveBeenCalledTimes(1);
    });

    it('stops notifying after unsubscribe', () => {
        const seen = vi.fn();
        repository.subscribe(seen)();
        repository.set('kanban', []);
        expect(seen).not.toHaveBeenCalled();
    });

    it('survives a value that cannot be serialised', () => {
        const cyclic: Record<string, unknown> = {};
        cyclic['self'] = cyclic;
        expect(() => repository.set('kanban', cyclic)).not.toThrow();
    });
});
