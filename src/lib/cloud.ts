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

/** Replaces local app data with the snapshot. Device-only keys are left alone. */
export function applySnapshot(snapshot: Snapshot): void {
    clearLocalData();
    Object.entries(snapshot).forEach(([key, value]) => {
        if (!key.startsWith(PREFIX) || DEVICE_ONLY.has(key)) return;
        try { localStorage.setItem(key, String(value)); } catch { /* storage full */ }
    });
}

export function clearLocalData(): void {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(PREFIX) && !DEVICE_ONLY.has(key)) doomed.push(key);
    }
    doomed.forEach(k => localStorage.removeItem(k));
}

async function request(token: string, init?: RequestInit) {
    const res = await fetch('/api/state', {
        ...init,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init?.headers },
    });
    if (!res.ok) throw new Error(`/api/state ${res.status}`);
    return res.json();
}

export async function fetchRemote(token: string): Promise<Snapshot | null> {
    const { data } = await request(token);
    return data && Object.keys(data).length ? (data as Snapshot) : null;
}

export async function pushRemote(token: string, snapshot: Snapshot): Promise<void> {
    await request(token, { method: 'PUT', body: JSON.stringify({ data: snapshot }) });
}
