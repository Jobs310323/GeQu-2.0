import type { StoreApi } from 'zustand';
import { DB } from '../lib/db';

// Store persistence.
//
// Deliberately NOT zustand's own `persist` middleware. That wraps the stored
// value in `{ state, version }`, which would change the on-disk format of every
// `gequ_*` key. Cloud sync (see lib/cloud.ts) sweeps those keys raw and ships
// them to the server as-is, so a format change would corrupt the data of every
// existing user and every other device already holding it.
//
// Instead each store hydrates from its existing key and mirrors changes back to
// it unchanged, so this refactor is invisible to storage and to sync.
//
// Phase 8 replaces `DB` here with the repository layer; that swap happens in
// this file and nowhere else.

/** Reads a store's initial value from its existing key. */
export function hydrate<T>(key: string, fallback: T): T {
    return DB.get<T>(key, fallback);
}

/**
 * Mirrors one slice of a store back to its key whenever it changes.
 *
 * Compares by reference, which is correct here because every action produces a
 * new array or object rather than mutating in place — so an unrelated change
 * elsewhere in the store does not trigger a write.
 */
export function persistSlice<T, S>(store: StoreApi<T>, key: string, select: (state: T) => S): void {
    store.subscribe((state, prev) => {
        const next = select(state);
        if (!Object.is(next, select(prev))) DB.save(key, next);
    });
}

/** Mirrors several slices of one store, each to its own key. */
export function persistSlices<T>(store: StoreApi<T>, slices: Record<string, (state: T) => unknown>): void {
    for (const [key, select] of Object.entries(slices)) persistSlice(store, key, select);
}
