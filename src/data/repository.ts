// The storage boundary.
//
// Everything above this line (stores, and through them the whole app) reads and
// writes user data through `Repository`. Everything below is an implementation
// detail — today localStorage, tomorrow IndexedDB — and swapping one for the
// other changes this directory and nothing else.
//
// The interface is deliberately synchronous for reads. Every consumer is a
// zustand store initialised at module load, and making that async would push
// a loading state into every screen for no user-visible gain: the whole dataset
// is a few hundred KB and is held in memory anyway. Writes are fire-and-forget
// for the same reason — the in-memory store is the source of truth for the
// current session, and persistence is a mirror of it.
//
// That shape is what makes IndexedDB usable here at all. IDB is async, so the
// adapter keeps a synchronous in-memory cache hydrated once at startup and
// writes through to IDB in the background. See `idb-repository.ts`.

/** The current shape of stored data. Bumped when a migration changes it. */
export const DATA_SCHEMA_VERSION = 1;

export interface Repository {
    /** Reads a value, or `fallback` when absent or unreadable. */
    get<T>(key: string, fallback: T): T;
    /** Writes a value. Failures are swallowed — see the note above. */
    set<T>(key: string, value: T): void;
    /** Removes a key. */
    remove(key: string): void;
    /** Every key this repository holds, without the `gequ_` prefix. */
    keys(): string[];
    /** Subscribes to writes. Returns an unsubscribe function. */
    subscribe(fn: () => void): () => void;
}
