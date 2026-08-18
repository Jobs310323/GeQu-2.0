import { useEffect, useRef } from 'react';
import { DB } from './db';

/** Long enough to swallow a burst of typing, short enough to feel instant. */
const DEBOUNCE_MS = 400;

/**
 * Writes `value` to localStorage under `key` whenever it changes — not on the
 * first run, and not more than once per burst.
 *
 * Two things this avoids:
 *
 * 1. The mount write. Every slice of app state is seeded with `DB.get(key)` and
 *    then persisted by an effect; a plain `useEffect(..., [value])` also fires
 *    on mount, so opening the app re-serialised and re-wrote roughly a dozen
 *    keys — the large ones (gym history, clinical results) included — with
 *    exactly the bytes it had just read, ringing every `onDbChange` listener on
 *    the way. Skipping it makes app start a pure read.
 *
 * 2. The write per keystroke. `JSON.stringify` of the whole diary or board on
 *    every character is synchronous work on the typing path, and each write
 *    also kicks CloudSync. Coalesced instead.
 *
 * The pending write is flushed on unmount and on `pagehide`, so nothing is lost
 * to closing the tab, switching apps on iOS, or signing out mid-sentence.
 * `pagehide` and not `beforeunload`: the latter is unreliable on mobile, where
 * a backgrounded tab can be discarded without ever firing it.
 *
 * The mount ref survives StrictMode's dev-only mount/unmount/remount, so in dev
 * the first write happens on the second mount. Production mounts once and skips
 * it entirely.
 */
export function usePersisted(key: string, value: unknown): void {
    const mounted = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Read by the flush paths, which must write the newest value, not the one
    // captured when the timer was armed.
    const latest = useRef(value);
    const keyRef = useRef(key);
    latest.current = value;
    keyRef.current = key;

    // Arming only. Deliberately no cleanup that writes: this effect re-runs on
    // every change, so flushing here would write on each one and there would be
    // no debounce left.
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        if (timer.current !== null) clearTimeout(timer.current);
        timer.current = setTimeout(() => {
            timer.current = null;
            DB.save(keyRef.current, latest.current);
        }, DEBOUNCE_MS);
    }, [key, value]);

    // Runs once. Owns the two ways a pending write must still land.
    useEffect(() => {
        const flush = () => {
            if (timer.current === null) return;
            clearTimeout(timer.current);
            timer.current = null;
            DB.save(keyRef.current, latest.current);
        };
        window.addEventListener('pagehide', flush);
        return () => {
            window.removeEventListener('pagehide', flush);
            flush();
        };
    }, []);
}
