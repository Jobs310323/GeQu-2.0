// Cloud sync between this browser's localStorage and the signed-in user's row
// in Postgres (see api/state.ts).
//
// localStorage stays the app's working store — every page reads and writes it
// synchronously as before. Sync only pulls a snapshot on sign-in and pushes one
// back after changes, so nothing else in the app had to change.

const PREFIX = 'gequ_';

/** Remembers whose data is currently in this browser, so accounts can't mix. */
export const OWNER_KEY = 'gequ_cloud_owner';

/** Never leaves this browser: an API key is a secret, not user data. */
const DEVICE_ONLY = new Set([OWNER_KEY, 'gequ_groq_key']);

export type Snapshot = Record<string, string>;

export function collectSnapshot(): Snapshot {
    const out: Snapshot = {};
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key?.startsWith(PREFIX) || DEVICE_ONLY.has(key)) continue;
        const value = localStorage.getItem(key);
        if (value !== null) out[key] = value;
    }
    return out;
}

/**
 * Writes the snapshot into localStorage.
 *
 * Writes FIRST, then removes only the app keys the snapshot did not carry. The
 * previous version cleared everything up front, so a failure part-way through —
 * a quota error, a closed tab — left the user with nothing at all. Now the worst
 * case is a partially-updated store, which the next merge repairs.
 *
 * Since sync merges rather than overwrites (see `lib/merge.ts`), the snapshot
 * passed here is already the union of both sides; the removal pass only clears
 * keys that are genuinely gone.
 */
export function applySnapshot(snapshot: Snapshot): void {
    const written = new Set<string>();
    Object.entries(snapshot).forEach(([key, value]) => {
        if (!key.startsWith(PREFIX) || DEVICE_ONLY.has(key)) return;
        try {
            localStorage.setItem(key, String(value));
            written.add(key);
        } catch { /* storage full — leave the existing value in place */ }
    });

    for (const key of appKeys()) {
        if (!written.has(key) && !(key in snapshot)) localStorage.removeItem(key);
    }
}

/** Every `gequ_*` key that belongs to the user's data, not to this device. */
function appKeys(): string[] {
    const out: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX) && !DEVICE_ONLY.has(key)) out.push(key);
    }
    return out;
}

export function clearLocalData(): void {
    appKeys().forEach(k => localStorage.removeItem(k));
}

/** What the server holds, plus the version a write must be based on. */
export type RemoteState = {
    /** null when the account has no row yet. */
    snapshot: Snapshot | null;
    /** 0 means "no row yet". */
    version: number;
};

/** Raised when a PUT was refused because the row moved on. Carries the winner. */
export class VersionConflict extends Error {
    readonly current: RemoteState;
    constructor(current: RemoteState) {
        super('version conflict');
        this.name = 'VersionConflict';
        this.current = current;
    }
}

async function request(token: string, init?: RequestInit) {
    const res = await fetch('/api/state', {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 409) throw new VersionConflict(toRemoteState(body));
    if (!res.ok) throw new Error(`/api/state ${res.status}`);
    return body as Record<string, unknown>;
}

function toRemoteState(body: Record<string, unknown>): RemoteState {
    const data = body?.['data'];
    const snapshot = data && typeof data === 'object' && Object.keys(data).length
        ? (data as Snapshot)
        : null;
    return { snapshot, version: Number(body?.['version'] ?? 0) };
}

export async function fetchRemote(token: string): Promise<RemoteState> {
    return toRemoteState(await request(token));
}

/**
 * Writes the snapshot, but only if the row is still at `baseVersion`.
 * Throws `VersionConflict` (carrying the current row) if another device wrote
 * first — the caller merges against it and retries.
 */
export async function pushRemote(token: string, snapshot: Snapshot, baseVersion: number): Promise<number> {
    const body = await request(token, {
        method: 'PUT',
        body: JSON.stringify({ data: snapshot, baseVersion }),
    });
    return Number(body?.['version'] ?? baseVersion + 1);
}
