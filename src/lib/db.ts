import { repository } from '../data';

// Local persistence, now a thin alias over the repository boundary (`src/data`).
//
// The storage decision moved to `src/data/index.ts` in Phase 8b: writes go to
// both localStorage and IndexedDB, reads come from localStorage. This module
// stays because ~30 call sites import `DB` and there is no value in churning
// them — but it holds no policy any more.
//
// New code should import `repository` from `src/data` directly.

/** Subscribe to writes. Returns an unsubscribe function. */
export const onDbChange = (fn: () => void): (() => void) => repository.subscribe(fn);

export const DB = {
    /**
     * Reads a stored value, falling back to `def` when the key is absent or the
     * stored JSON is unparseable.
     *
     * The return type is the caller's assertion about what is stored, not a
     * guarantee: nothing validates the parsed shape against `T`. That is honest
     * for data this app wrote itself. Schema validation lands with the record
     * envelopes described in docs/DATA_MODEL.md.
     */
    get: <T,>(key: string, def: T): T => repository.get<T>(key, def),

    save: <T,>(key: string, data: T): void => repository.set<T>(key, data),
};
