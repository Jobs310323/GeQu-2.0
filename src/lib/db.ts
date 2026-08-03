// Local-storage persistence layer for GeQu.
// Hardened against corrupted / missing entries so a single bad key
// can never crash the whole app on startup.
const PREFIX = 'gequ_';

// Cloud sync listens here so it knows when there is something new to push.
const listeners = new Set<() => void>();

/** Subscribe to writes. Returns an unsubscribe function. */
export function onDbChange(fn: () => void): () => void {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

export const DB = {
    get: (key: string, def: any = []): any => {
        try {
            const raw = localStorage.getItem(`${PREFIX}${key}`);
            if (raw === null) return def;
            return JSON.parse(raw) || def;
        } catch {
            // Corrupted JSON — fall back to the default instead of throwing.
            return def;
        }
    },
    save: (key: string, data: any): void => {
        try {
            localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(data));
        } catch {
            // Storage full or unavailable (private mode): ignore silently.
        }
        listeners.forEach(fn => fn());
    },
};
