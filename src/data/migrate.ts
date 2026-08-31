import { DATA_SCHEMA_VERSION } from './repository';

// Migrating a browser's `gequ_*` data from localStorage into IndexedDB.
//
// This is the one operation in the app that can destroy data that exists
// nowhere else, so it is built to be boring:
//
//   1. It NEVER deletes from localStorage. The old copy stays as the rollback
//      path, indefinitely. Disk is not the constraint; a user losing five years
//      of journal entries is.
//   2. It is idempotent. Running it twice, or in two tabs at once, or after a
//      refresh that interrupted it, converges on the same result.
//   3. It verifies before it commits. The "migrated" flag is only written after
//      every key has been read back out of IndexedDB and compared.
//   4. A partial failure leaves the flag unset, so the next run retries. Until
//      it succeeds the app keeps reading localStorage and the user notices
//      nothing.

const PREFIX = 'gequ_';
export const DB_NAME = 'gequ';
export const STORE = 'kv';
/** Set only after a verified migration. Its presence is what switches reads. */
export const MIGRATED_KEY = 'gequ_idb_migrated';

export type MigrationResult = {
    status: 'migrated' | 'already-migrated' | 'nothing-to-migrate' | 'failed';
    /** Keys successfully written AND read back. */
    verified: string[];
    /** Why it failed, when it did. */
    reason?: string;
};

/** Keys that belong to the device rather than the user's data. */
const DEVICE_ONLY = new Set(['gequ_cloud_owner', 'gequ_groq_key', MIGRATED_KEY]);

function localKeys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX) && !DEVICE_ONLY.has(key)) out.push(key);
    }
    return out;
}

/** Opens (and if needed creates) the object store. */
export function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DATA_SCHEMA_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
    });
}

function tx(db: IDBDatabase, mode: IDBTransactionMode): IDBObjectStore {
    return db.transaction(STORE, mode).objectStore(STORE);
}

export function idbGet(db: IDBDatabase, key: string): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readonly').get(key);
        req.onsuccess = () => resolve(req.result as string | undefined);
        req.onerror = () => reject(req.error);
    });
}

export function idbSet(db: IDBDatabase, key: string, value: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

export function idbKeys(db: IDBDatabase): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readonly').getAllKeys();
        req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
        req.onerror = () => reject(req.error);
    });
}

export function idbDelete(db: IDBDatabase, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const req = tx(db, 'readwrite').delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/** True once a verified migration has run in this browser. */
export function hasMigrated(): boolean {
    return localStorage.getItem(MIGRATED_KEY) === String(DATA_SCHEMA_VERSION);
}

/**
 * Copies every `gequ_*` key from localStorage into IndexedDB, verifies each one
 * by reading it back, and only then records that the migration happened.
 *
 * Safe to call on every startup: it returns early once the flag is set, and it
 * is safe to interrupt — an unfinished run simply leaves the flag unset and the
 * app keeps reading localStorage.
 */
export async function migrateToIdb(): Promise<MigrationResult> {
    if (hasMigrated()) return { status: 'already-migrated', verified: [] };

    const keys = localKeys();
    if (keys.length === 0) {
        // A brand-new browser has nothing to copy, but it is still "migrated":
        // there is no old data to fall back to, so reads can go to IDB.
        localStorage.setItem(MIGRATED_KEY, String(DATA_SCHEMA_VERSION));
        return { status: 'nothing-to-migrate', verified: [] };
    }

    let db: IDBDatabase;
    try {
        db = await openDb();
    } catch (e) {
        // Private browsing in some engines refuses IndexedDB outright. That is
        // not an error the user should ever see — localStorage keeps working.
        return { status: 'failed', verified: [], reason: reasonFor(e, 'open failed') };
    }

    const verified: string[] = [];
    try {
        for (const key of keys) {
            const value = localStorage.getItem(key);
            if (value === null) continue;   // removed between listing and reading

            await idbSet(db, key, value);

            // Read back before counting it. A write that reports success and
            // stores nothing is exactly the failure this guards against.
            const roundTripped = await idbGet(db, key);
            if (roundTripped !== value) {
                return {
                    status: 'failed', verified,
                    reason: `verification failed for ${key}`,
                };
            }
            verified.push(key);
        }
    } catch (e) {
        // Quota, or the tab closing mid-write. The flag stays unset, so the next
        // startup retries from the top; already-copied keys are simply rewritten.
        return { status: 'failed', verified, reason: reasonFor(e, 'write failed') };
    } finally {
        db.close();
    }

    // Every key is in IndexedDB and has been read back. Only now is it safe to
    // let reads come from there. localStorage is deliberately left intact.
    localStorage.setItem(MIGRATED_KEY, String(DATA_SCHEMA_VERSION));
    return { status: 'migrated', verified };
}

/**
 * Reverts to localStorage as the read source.
 *
 * The rollback path, and the reason the migration never deletes: clearing the
 * flag is enough, because the original data was never touched.
 */
export function rollbackToLocalStorage(): void {
    localStorage.removeItem(MIGRATED_KEY);
}

function reasonFor(e: unknown, fallback: string): string {
    return e instanceof Error ? e.message : fallback;
}
