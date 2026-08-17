import { useEffect, useRef } from 'react';
import { DB } from './db';

/**
 * Writes `value` to localStorage under `key` whenever it changes — but not on
 * the first run.
 *
 * Every slice of app state is seeded with `DB.get(key)` and then persisted by an
 * effect. A plain `useEffect(() => DB.save(key, value), [value])` also fires on
 * mount, so opening the app re-serialised and re-wrote roughly a dozen keys —
 * including the large ones (gym history, clinical results, knowledge) — with
 * exactly the bytes it had just read, and rang every `onDbChange` listener while
 * doing it. Skipping the mount run makes app start a pure read.
 *
 * The ref survives StrictMode's dev-only mount/unmount/remount, so in dev the
 * write happens once on the second mount. Production mounts once and skips it.
 */
export function usePersisted(key: string, value: unknown): void {
    const mounted = useRef(false);
    useEffect(() => {
        if (!mounted.current) { mounted.current = true; return; }
        DB.save(key, value);
    }, [key, value]);
}
