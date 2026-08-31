import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    OWNER_KEY, VersionConflict, applySnapshot, clearLocalData,
    collectSnapshot, fetchRemote, pushRemote,
} from './cloud';
import type { Snapshot } from './cloud';

/**
 * The transport half of the sync fix. Two properties matter here, and both were
 * broken before:
 *
 *   1. Applying a snapshot must never leave the user with LESS than they
 *      started with. The old `applySnapshot` cleared everything up front, so a
 *      quota error or a closed tab part-way through wiped the account's data
 *      off the device.
 *   2. A write must be refusable. Without a version the server could not tell a
 *      stale client from a current one, so every push overwrote whatever was
 *      there.
 */

const originalFetch = globalThis.fetch;
beforeEach(() => localStorage.clear());
afterEach(() => { globalThis.fetch = originalFetch; vi.restoreAllMocks(); });

const mockJson = (status: number, body: unknown) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: async () => body,
    }) as unknown as typeof fetch;
};

describe('collectSnapshot', () => {
    it('gathers gequ_* keys', () => {
        localStorage.setItem('gequ_kanban', '[]');
        localStorage.setItem('gequ_logs', '[1]');
        localStorage.setItem('unrelated', 'x');
        expect(Object.keys(collectSnapshot()).sort()).toEqual(['gequ_kanban', 'gequ_logs']);
    });

    it('never ships the API key or the owner marker', () => {
        // A Groq key is a credential, not user data — it must not reach the
        // server or another device.
        localStorage.setItem('gequ_groq_key', 'gsk_secret');
        localStorage.setItem(OWNER_KEY, 'user_1');
        localStorage.setItem('gequ_kanban', '[]');

        const snap = collectSnapshot();
        expect(snap).not.toHaveProperty('gequ_groq_key');
        expect(snap).not.toHaveProperty(OWNER_KEY);
        expect(snap).toHaveProperty('gequ_kanban');
    });
});

describe('applySnapshot', () => {
    it('writes the snapshot', () => {
        applySnapshot({ gequ_kanban: '[{"id":1}]' });
        expect(localStorage.getItem('gequ_kanban')).toBe('[{"id":1}]');
    });

    it('leaves device-only keys untouched', () => {
        localStorage.setItem('gequ_groq_key', 'gsk_secret');
        localStorage.setItem(OWNER_KEY, 'user_1');
        applySnapshot({ gequ_kanban: '[]' });
        expect(localStorage.getItem('gequ_groq_key')).toBe('gsk_secret');
        expect(localStorage.getItem(OWNER_KEY)).toBe('user_1');
    });

    it('removes an app key the snapshot no longer carries', () => {
        localStorage.setItem('gequ_stale', '[1]');
        applySnapshot({ gequ_kanban: '[]' });
        expect(localStorage.getItem('gequ_stale')).toBeNull();
    });

    it('does not destroy existing data before writing', () => {
        // The regression that mattered: a failure mid-apply used to leave the
        // user with nothing, because the clear happened first. Make every write
        // throw and assert the original data survived.
        localStorage.setItem('gequ_kanban', '[{"id":1}]');
        localStorage.setItem('gequ_logs', '[{"id":2}]');

        const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('QuotaExceededError');
        });
        expect(() => applySnapshot({ gequ_kanban: '[{"id":9}]', gequ_logs: '[{"id":9}]' })).not.toThrow();
        spy.mockRestore();

        expect(localStorage.getItem('gequ_kanban')).toBe('[{"id":1}]');
        expect(localStorage.getItem('gequ_logs')).toBe('[{"id":2}]');
    });
});

describe('clearLocalData', () => {
    it('removes app data but keeps the device-only keys', () => {
        localStorage.setItem('gequ_kanban', '[]');
        localStorage.setItem('gequ_groq_key', 'gsk');
        localStorage.setItem(OWNER_KEY, 'user_1');
        clearLocalData();
        expect(localStorage.getItem('gequ_kanban')).toBeNull();
        expect(localStorage.getItem('gequ_groq_key')).toBe('gsk');
        expect(localStorage.getItem(OWNER_KEY)).toBe('user_1');
    });
});

describe('fetchRemote', () => {
    it('reports version 0 and no snapshot for an account with no row', () => {
        mockJson(200, { data: null, version: 0, updatedAt: null });
        return expect(fetchRemote('tok')).resolves.toEqual({ snapshot: null, version: 0 });
    });

    it('returns the snapshot and its version', async () => {
        mockJson(200, { data: { gequ_kanban: '[]' }, version: 7 });
        await expect(fetchRemote('tok')).resolves.toEqual({ snapshot: { gequ_kanban: '[]' }, version: 7 });
    });

    it('treats an empty object as no snapshot', async () => {
        // An empty row must not be mistaken for "the account has no data", nor
        // merged as if it were a real (and therefore deleting) state.
        mockJson(200, { data: {}, version: 3 });
        await expect(fetchRemote('tok')).resolves.toEqual({ snapshot: null, version: 3 });
    });
});

describe('pushRemote', () => {
    it('sends the base version the client read', async () => {
        mockJson(200, { ok: true, version: 8 });
        await pushRemote('tok', { gequ_kanban: '[]' } as Snapshot, 7);

        const call = (globalThis.fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]!;
        expect(JSON.parse(String(call[1].body))).toMatchObject({ baseVersion: 7 });
    });

    it('returns the new version so the client can chain writes', async () => {
        mockJson(200, { ok: true, version: 8 });
        await expect(pushRemote('tok', {} as Snapshot, 7)).resolves.toBe(8);
    });

    it('throws VersionConflict carrying the winning row on 409', async () => {
        // The whole point: the client is told what it lost to, so it can merge
        // and retry rather than either giving up or clobbering.
        mockJson(409, { error: 'version conflict', data: { gequ_kanban: '[{"id":2}]' }, version: 9 });

        await expect(pushRemote('tok', {} as Snapshot, 7)).rejects.toBeInstanceOf(VersionConflict);
        await expect(pushRemote('tok', {} as Snapshot, 7)).rejects.toMatchObject({
            current: { snapshot: { gequ_kanban: '[{"id":2}]' }, version: 9 },
        });
    });

    it('throws a plain error for other failures', async () => {
        mockJson(500, { error: 'server error' });
        await expect(pushRemote('tok', {} as Snapshot, 1)).rejects.toThrow('/api/state 500');
    });
});
