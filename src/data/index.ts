import type { Repository } from './repository';
import { DATA_SCHEMA_VERSION } from './repository';
import { hasMigrated, migrateToIdb, openDb, idbSet, idbDelete, idbGet } from './migrate';

// The repository the app actually uses.
//
// Reads are synchronous and come from an in-memory cache seeded at startup;
// writes go to BOTH localStorage and IndexedDB. That dual-write is the point:
// neither store is ever behind the other, so switching which one seeds the cache
// is a one-line change and rolling back costs nothing.
//
// Why localStorage remains the seed for now: it is synchronous, so the cache is
// warm before the first component renders. Seeding from IndexedDB means an
// async read before paint, which needs a loading state in the shell. That work
// is real and is not justified by anything the user would notice today — the
// whole dataset is a few hundred KB. What IS justified is having the data safely
// in IDB, verified, with the migration proven, so that the switch can be made
// whenever a reason to make it appears (a larger dataset, a storage-pressure
// eviction, an offline requirement localStorage cannot meet).
//
// So: IndexedDB is populated and kept current from today. Reads move later, and
// `docs/DATA_MODEL.md` records what that will take.

const PREFIX = 'gequ_';

const listeners = new Set<() => void>();

/** Resolved once the migration has run; null while IDB is unavailable. */
let idb: IDBDatabase | null = null;

export const repository: Repository = {
    get<T>(key: string, fallback: T): T {
        try {
            const raw = localStorage.getItem(`${PREFIX}${key}`);
            if (raw === null) return fallback;
            const parsed = JSON.parse(raw) as T | null;
            return parsed ?? fallback;
        } catch {
            // Corrupted JSON — fall back rather than throwing on startup.
            return fallback;
        }
    },

    set<T>(key: string, value: T): void {
        const full = `${PREFIX}${key}`;
        let serialised: string;
        try {
            serialised = JSON.stringify(value);
        } catch {
            return; // cyclic or unserialisable: nothing sensible to store
        }

        try {
            localStorage.setItem(full, serialised);
        } catch {
            // Storage full or unavailable (private mode): ignore silently. The
            // in-memory store is still correct for this session.
        }

        // Mirror to IndexedDB. Deliberately not awaited — persistence must not
        // make a state update async, and a failure here is survivable because
        // localStorage already has the value.
        if (idb) void idbSet(idb, full, serialised).catch(() => { /* mirrored best-effort */ });

        listeners.forEach(fn => fn());
    },

    remove(key: string): void {
        const full = `${PREFIX}${key}`;
        localStorage.removeItem(full);
        if (idb) void idbDelete(idb, full).catch(() => { /* mirrored best-effort */ });
        listeners.forEach(fn => fn());
    },

    keys(): string[] {
        const out: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(PREFIX)) out.push(key.slice(PREFIX.length));
        }
        return out;
    },

    subscribe(fn: () => void): () => void {
        listeners.add(fn);
        return () => { listeners.delete(fn); };
    },
};

/**
 * Runs the migration and opens the mirror, once, at startup.
 *
 * Everything here is best-effort: if IndexedDB is unavailable the app is
 * unaffected, because localStorage is still the read path. Nothing awaits this
 * before rendering.
 */
export async function initStorage(): Promise<void> {
    try {
        if (!hasMigrated()) await migrateToIdb();
        idb = await openDb();
        await catchUp(idb);
    } catch {
        idb = null;   // no mirror this session; localStorage carries on alone
    }
}

/**
 * Mirrors anything localStorage holds that IndexedDB does not.
 *
 * The gap this closes: `initStorage` is async and deliberately not awaited, so
 * the stores are already live and the user can already be typing before the
 * mirror opens. Any write in that window goes to localStorage only. On a fresh
 * browser there is no migration to catch it either — `migrateToIdb` returns
 * 'nothing-to-migrate' before the first key exists.
 *
 * Without this, a user's very first session would leave IndexedDB permanently
 * behind by however much they did in the first few hundred milliseconds.
 */
async function catchUp(db: IDBDatabase): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX)) continue;
        const value = localStorage.getItem(key);
        if (value === null) continue;
        try {
            if ((await idbGet(db, key)) !== value) await idbSet(db, key, value);
        } catch {
            // One key failing to mirror is not worth abandoning the rest.
        }
    }
}

export { DATA_SCHEMA_VERSION };
export type { Repository };
