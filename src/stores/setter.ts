import type { SetStateAction } from 'react';

/**
 * Applies a `useState`-style update — either a new value or a function of the
 * previous one.
 *
 * Store actions accept both because screens legitimately need the updater form
 * (`setTasks(prev => prev.map(...))`) to derive from current state without
 * closing over a stale copy. Keeping that contract also means a screen can move
 * from `useState` to a store, or the reverse, without being rewritten.
 */
export function resolve<T>(next: SetStateAction<T>, prev: T): T {
    return typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
}
