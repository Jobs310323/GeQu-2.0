// Local-storage persistence for GeQu.
//
// Hardened against corrupted or missing entries so one bad key can never crash
// the app on startup, and typed at the read so callers get a real type back
// instead of `any` spreading from here into every consumer.
//
// Phase 8 replaces this with the repository layer in `src/data/` (ADR-003).
// The `get`/`save` signatures are deliberately narrow so that swap stays small.

const PREFIX = 'gequ_';

// Cloud sync listens here so it knows when there is something new to push.
const listeners = new Set<() => void>();

/** Subscribe to writes. Returns an unsubscribe function. */
export function onDbChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

export const DB = {
    /**
     * Reads a stored value, falling back to `def` when the key is absent or the
     * stored JSON is unparseable.
     *
     * The return type is the caller's assertion about what is stored, not a
     * guarantee: nothing validates the parsed shape against `T`. That is
     * honest for data this app wrote itself, and it is where schema versioning
     * and validation land in Phase 8. Until then, treat a `DB.get` result the
     * way you would treat a JSON response — the type says what you expect.
     */
    get<T>(key: string, def: T): T {
        try {
            const raw = localStorage.getItem(`${PREFIX}${key}`);
            if (raw === null) return def;
            const parsed = JSON.parse(raw) as T | null;
            return parsed ?? def;
        } catch {
            // Corrupted JSON — fall back to the default instead of throwing.
            return def;
        }
    },

    save<T>(key: string, data: T): void {
        try {
            localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
        } catch {
            // Storage full or unavailable (private mode): ignore silently.
        }
        listeners.forEach(fn => fn());
    },
};
