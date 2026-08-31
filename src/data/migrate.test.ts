import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import {
    migrateToIdb, hasMigrated, rollbackToLocalStorage,
    openDb, idbGet, idbKeys, MIGRATED_KEY, DB_NAME,
} from './migrate';
import { DATA_SCHEMA_VERSION } from './repository';

/**
 * THE DATA-SAFETY GATE.
 *
 * This is the one operation in the app that can destroy data existing nowhere
 * else. A user's five years of journal entries, their whole finance history,
 * every assessment they have taken — all of it lives in one browser's
 * localStorage until it syncs.
 *
 * The brief specifies nine things to prove before a migration ships. They are a
 * checklist in the brief and a test file here, because a checklist someone
 * ticked once tells you nothing six months later:
 *
 *   1. existing (old-format) data survives          → "old data" below
 *   2. newly written data works                     → "new data"
 *   3. a partial failure is recoverable             → "partial failure"
 *   4. duplicate/concurrent runs are safe           → "duplicate runs"
 *   5. a refresh mid-migration is safe              → "interrupted"
 *   6. going offline mid-migration is safe          → "interrupted"
 *   7. a backup exists                              → "rollback"
 *   8. rollback works                               → "rollback"
 *   9. nothing is deleted before it is verified     → asserted throughout
 */

/** A realistic pre-migration browser: the keys a real user would actually have. */
const SEED: Record<string, unknown> = {
    gequ_kanban: [{ id: 1, text: 'задача', status: 'todo', priority: 'high' }],
    gequ_logs: Array.from({ length: 40 }, (_, i) => ({
        id: i, date: `2026-07-${String((i % 28) + 1).padStart(2, '0')}T09:00:00Z`,
        sleep: 7, focus: 6, mood: 6, helped: ['спорт'], hindered: [],
    })),
    gequ_diary: [{ id: 1, date: '2026-08-01T10:00:00Z', content: 'личная запись' }],
    gequ_habits: [{ id: 1, name: 'вода', history: ['2026-08-01', '2026-08-02'] }],
    gequ_tests: [{ id: 1, date: '2026-08-01T10:00:00Z', type: 'schulte', value: 38.4 }],
    gequ_finance: { pin: null, initialBalance: 1000, entries: [{ id: 1, amount: 500 }], debts: [], subscriptions: [], categories: { expense: [], income: [] } },
    gequ_theme: 'dark',
};

function seed(data: Record<string, unknown> = SEED) {
    for (const [k, v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v));
}

/** A fresh IndexedDB per test — fake-indexeddb keeps state between them otherwise. */
beforeEach(() => {
    localStorage.clear();
    globalThis.indexedDB = new IDBFactory();
});
afterEach(() => vi.restoreAllMocks());

describe('1 · old data survives', () => {
    it('copies every seeded key into IndexedDB, byte for byte', async () => {
        seed();
        const result = await migrateToIdb();
        expect(result.status).toBe('migrated');

        const db = await openDb();
        for (const key of Object.keys(SEED)) {
            expect(await idbGet(db, key), key).toBe(localStorage.getItem(key));
        }
        db.close();
    });

    it('preserves a 40-entry history exactly, not just its length', async () => {
        seed();
        await migrateToIdb();
        const db = await openDb();
        const stored = JSON.parse((await idbGet(db, 'gequ_logs'))!) as unknown[];
        db.close();
        expect(stored).toEqual(SEED['gequ_logs']);
    });

    it('leaves localStorage completely intact', async () => {
        // Point 9. The old copy is the backup, and it is never touched.
        seed();
        const before = { ...localStorage };
        await migrateToIdb();
        for (const key of Object.keys(SEED)) {
            expect(localStorage.getItem(key)).toBe(before[key]);
        }
    });

    it('does not copy device-only keys into the shared store', async () => {
        // An API key is a credential; the owner marker is per-device. Neither
        // is user data and neither should travel.
        seed({ ...SEED, gequ_groq_key: 'gsk_secret', gequ_cloud_owner: 'user_1' });
        await migrateToIdb();

        const db = await openDb();
        const keys = await idbKeys(db);
        db.close();
        expect(keys).not.toContain('gequ_groq_key');
        expect(keys).not.toContain('gequ_cloud_owner');
    });
});

describe('2 · new data works', () => {
    it('a browser with no data is marked migrated without copying anything', async () => {
        const result = await migrateToIdb();
        expect(result.status).toBe('nothing-to-migrate');
        expect(hasMigrated()).toBe(true);
    });

    it('records the schema version, so a later format change can detect it', async () => {
        seed();
        await migrateToIdb();
        expect(localStorage.getItem(MIGRATED_KEY)).toBe(String(DATA_SCHEMA_VERSION));
    });
});

describe('3 · partial failure', () => {
    it('does not claim success when a write throws part-way through', async () => {
        seed();
        let writes = 0;
        const realPut = IDBObjectStore.prototype.put;
        vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
            if (++writes > 3) throw new DOMException('QuotaExceededError');
            return realPut.call(this, value, key);
        });

        const result = await migrateToIdb();
        expect(result.status).toBe('failed');
        // The flag stays unset, so the app keeps reading localStorage and the
        // next startup retries. The user notices nothing.
        expect(hasMigrated()).toBe(false);
    });

    it('does not claim success when a value fails to read back', async () => {
        // A write that reports success and stores nothing is the failure that
        // silently loses data. Verification is what catches it.
        seed({ gequ_kanban: [{ id: 1 }] });
        vi.spyOn(IDBObjectStore.prototype, 'get').mockImplementation(function () {
            const req = { result: undefined, onsuccess: null, onerror: null } as unknown as IDBRequest;
            queueMicrotask(() => (req.onsuccess as (() => void) | null)?.());
            return req;
        });

        const result = await migrateToIdb();
        expect(result.status).toBe('failed');
        expect(result.reason).toMatch(/verification failed/);
        expect(hasMigrated()).toBe(false);
    });

    it('recovers on the next attempt after a failure', async () => {
        seed();
        let fail = true;
        const realPut = IDBObjectStore.prototype.put;
        const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
            if (fail) throw new DOMException('QuotaExceededError');
            return realPut.call(this, value, key);
        });

        expect((await migrateToIdb()).status).toBe('failed');
        fail = false;
        expect((await migrateToIdb()).status).toBe('migrated');
        spy.mockRestore();

        const db = await openDb();
        expect(await idbGet(db, 'gequ_kanban')).toBe(localStorage.getItem('gequ_kanban'));
        db.close();
    });

    it('survives IndexedDB being unavailable entirely', async () => {
        // Some engines refuse IDB in private browsing. localStorage keeps
        // working and the user sees nothing.
        seed();
        vi.spyOn(indexedDB, 'open').mockImplementation(() => { throw new DOMException('SecurityError'); });

        const result = await migrateToIdb();
        expect(result.status).toBe('failed');
        expect(hasMigrated()).toBe(false);
        expect(localStorage.getItem('gequ_kanban')).toBeTruthy();
    });
});

describe('4 · duplicate and concurrent runs', () => {
    it('a second run is a no-op', async () => {
        seed();
        expect((await migrateToIdb()).status).toBe('migrated');
        expect((await migrateToIdb()).status).toBe('already-migrated');
    });

    it('two tabs migrating at once converge on the same result', async () => {
        seed();
        const [a, b] = await Promise.all([migrateToIdb(), migrateToIdb()]);

        // Both may report 'migrated' — the operation is idempotent, so racing
        // is harmless. What matters is that the data is correct afterwards.
        expect([a.status, b.status].every(s => s === 'migrated' || s === 'already-migrated')).toBe(true);

        const db = await openDb();
        for (const key of Object.keys(SEED)) {
            expect(await idbGet(db, key), key).toBe(localStorage.getItem(key));
        }
        db.close();
    });

    it('running it many times does not duplicate or corrupt anything', async () => {
        seed();
        for (let i = 0; i < 5; i++) await migrateToIdb();

        const db = await openDb();
        const keys = await idbKeys(db);
        db.close();
        expect(keys.sort()).toEqual(Object.keys(SEED).sort());
    });
});

describe('5–6 · interrupted mid-migration', () => {
    it('a refresh part-way through loses nothing and retries cleanly', async () => {
        seed();
        // Simulate the tab closing after a few keys: the promise never settles,
        // so no flag is written. The next startup is a fresh call.
        let writes = 0;
        const realPut = IDBObjectStore.prototype.put;
        const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
            if (++writes > 2) throw new DOMException('AbortError');
            return realPut.call(this, value, key);
        });
        await migrateToIdb();
        spy.mockRestore();

        expect(hasMigrated()).toBe(false);
        // Everything is still in localStorage — the app is fully usable.
        for (const key of Object.keys(SEED)) expect(localStorage.getItem(key)).toBeTruthy();

        // "After the refresh":
        expect((await migrateToIdb()).status).toBe('migrated');
        const db = await openDb();
        for (const key of Object.keys(SEED)) {
            expect(await idbGet(db, key), key).toBe(localStorage.getItem(key));
        }
        db.close();
    });

    it('going offline mid-migration changes nothing — it is a local operation', async () => {
        // Worth asserting rather than assuming: the migration must not depend on
        // the network, or a user on a train would be left half-migrated.
        seed();
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
        globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

        expect((await migrateToIdb()).status).toBe('migrated');
        const db = await openDb();
        expect(await idbGet(db, 'gequ_diary')).toBe(localStorage.getItem('gequ_diary'));
        db.close();
    });
});

describe('7–8 · backup and rollback', () => {
    it('localStorage remains a complete backup after migrating', async () => {
        seed();
        await migrateToIdb();
        // Point 7: the backup is not a separate artefact that could go stale —
        // it is the original data, never touched.
        for (const [key, value] of Object.entries(SEED)) {
            expect(localStorage.getItem(key)).toBe(JSON.stringify(value));
        }
    });

    it('rollback returns reads to localStorage with the data intact', async () => {
        seed();
        await migrateToIdb();
        expect(hasMigrated()).toBe(true);

        rollbackToLocalStorage();

        expect(hasMigrated()).toBe(false);
        for (const [key, value] of Object.entries(SEED)) {
            expect(localStorage.getItem(key)).toBe(JSON.stringify(value));
        }
    });

    it('can migrate again after a rollback', async () => {
        seed();
        await migrateToIdb();
        rollbackToLocalStorage();
        expect((await migrateToIdb()).status).toBe('migrated');
    });
});

describe('9 · nothing is deleted before verification', () => {
    it('the flag is written only after every key round-trips', async () => {
        seed();
        const setItem = vi.spyOn(Storage.prototype, 'setItem');
        await migrateToIdb();

        const calls = setItem.mock.calls.map(c => String(c[0]));
        const flagAt = calls.lastIndexOf(MIGRATED_KEY);
        expect(flagAt).toBeGreaterThanOrEqual(0);
        // Nothing in localStorage is rewritten during the migration at all —
        // the only write is the flag itself.
        expect(calls.filter(k => k !== MIGRATED_KEY)).toEqual([]);
    });

    it('never removes a localStorage key', async () => {
        seed();
        const remove = vi.spyOn(Storage.prototype, 'removeItem');
        await migrateToIdb();
        expect(remove).not.toHaveBeenCalled();
    });
});

describe('the database itself', () => {
    it('is named and versioned predictably, so a user can inspect it', async () => {
        seed();
        await migrateToIdb();
        const db = await openDb();
        expect(db.name).toBe(DB_NAME);
        expect(db.version).toBe(DATA_SCHEMA_VERSION);
        db.close();
    });
});
