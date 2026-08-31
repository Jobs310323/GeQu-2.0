import type { Snapshot } from './cloud';

// Merging this device's data with the account's cloud copy.
//
// WHY THIS EXISTS
//
// Sync used to be a whole-blob overwrite with no merge at all, and `CloudSync`
// only pulled when the *account* changed. So a device that had been used
// before never re-read the cloud: it just pushed whatever it still held. Use
// laptop, then phone, then laptop again, and the laptop's stale snapshot
// silently replaced everything the phone had done. Not "last write wins" —
// first device wins, and the loss was unbounded.
//
// This module is the fix's core: given the local snapshot and the remote one,
// produce a snapshot that loses nothing.
//
// THE CONSTRAINT THAT SHAPES THE DESIGN
//
// Stored records carry no `updatedAt`. Every collection has an `id` and several
// have a `date`, but nothing records when a record was last *edited*. So a
// same-id conflict cannot be resolved by recency, and a design claiming
// otherwise would be guessing.
//
// That is acceptable, because it is not where the damage is. The failure that
// loses data is deletion by omission — a stale snapshot dropping records the
// other device added. Union by id fixes that completely. Field-level conflicts
// on a single record are rarer and far less costly, and records gain
// `updatedAt` going forward so this improves without rewriting anything stored.
//
// KNOWN LIMITATION, stated rather than hidden: because the merge is a union, a
// deletion made on one device can be undone by another device that still holds
// the record. Making deletions stick needs tombstones. Until then, erring
// toward keeping data is the right trade — the behaviour being replaced lost
// data outright.

/** How a given key's two versions are reconciled. */
export type MergePolicy =
    /** Records of things that happened. Union by id; nothing is ever dropped. */
    | 'append-only'
    /** Live working items. Union by id; on collision the fresher copy wins. */
    | 'merge-by-id'
    /** An object whose fields are themselves collections or scalars. */
    | 'deep-merge'
    /** A single value with no internal structure worth reconciling. */
    | 'last-write-wins';

/**
 * Policy per `gequ_*` key.
 *
 * `append-only` is deliberately the strictest bucket: a journal entry, a day
 * log, a completed assessment and a CBT record are all accounts of something
 * that already happened. Nothing may remove one behind the user's back, so
 * these never take a deletion from either side.
 */
export const POLICY: Record<string, MergePolicy> = {
    // Records of events — never removed by a merge.
    gequ_diary: 'append-only',
    gequ_logs: 'append-only',
    gequ_tests: 'append-only',
    gequ_clinical: 'append-only',
    gequ_cbt: 'append-only',
    gequ_snowmanDays: 'append-only',

    // Live working items — union, fresher copy wins a collision.
    gequ_kanban: 'merge-by-id',
    gequ_goals: 'merge-by-id',
    gequ_habits: 'merge-by-id',
    gequ_reminders: 'merge-by-id',
    gequ_circles: 'merge-by-id',
    gequ_snowmanLabels: 'merge-by-id',

    // Objects wrapping collections.
    gequ_finance: 'deep-merge',
    gequ_gym: 'deep-merge',

    // Settings and caches — no internal structure worth reconciling.
    gequ_theme: 'last-write-wins',
    gequ_dopamineMenu: 'last-write-wins',
    gequ_prefs: 'last-write-wins',
    gequ_ach: 'last-write-wins',
    gequ_onboarding: 'last-write-wins',
};

/**
 * The policy for a key.
 *
 * Unknown keys fall back to last-write-wins favouring **local**. A key added by
 * a newer version of the app must never vanish just because this build's
 * `POLICY` table has not heard of it.
 */
export function policyFor(key: string): MergePolicy {
    return POLICY[key] ?? 'last-write-wins';
}

/** A record that can be identified across devices. */
type Identified = { id: string | number; updatedAt?: string };

const hasId = (v: unknown): v is Identified =>
    typeof v === 'object' && v !== null && 'id' in v &&
    (typeof (v as Identified).id === 'string' || typeof (v as Identified).id === 'number');

const isIdCollection = (v: unknown): v is Identified[] =>
    Array.isArray(v) && v.every(hasId);

/**
 * Union two collections of identified records.
 *
 * Order follows the remote list first, then local additions, so a list that one
 * device reordered does not shuffle on the other. `preferLocal` decides a
 * collision only when neither side carries `updatedAt`.
 */
export function mergeById(local: Identified[], remote: Identified[]): Identified[] {
    const out = new Map<string, Identified>();
    for (const r of remote) out.set(String(r.id), r);

    for (const l of local) {
        const key = String(l.id);
        const r = out.get(key);
        if (!r) { out.set(key, l); continue; }

        // Both sides have this record. Prefer whichever states it is newer;
        // absent that, keep the local copy — it is the device the user is on.
        const lt = typeof l.updatedAt === 'string' ? Date.parse(l.updatedAt) : NaN;
        const rt = typeof r.updatedAt === 'string' ? Date.parse(r.updatedAt) : NaN;
        if (Number.isFinite(lt) && Number.isFinite(rt)) {
            out.set(key, lt >= rt ? l : r);
        } else {
            out.set(key, l);
        }
    }
    return [...out.values()];
}

/** Merge one value according to `policy`. Exported for the deep-merge recursion. */
function mergeValue(policy: MergePolicy, local: unknown, remote: unknown): unknown {
    // A side that has nothing contributes nothing.
    if (local === undefined || local === null) return remote;
    if (remote === undefined || remote === null) return local;

    switch (policy) {
        case 'append-only':
        case 'merge-by-id':
            if (isIdCollection(local) && isIdCollection(remote)) return mergeById(local, remote);
            // Shape is not what the policy assumed — the stored value predates
            // the current model, or is corrupt. Keep local rather than guess.
            return local;

        case 'deep-merge': {
            if (!isPlainObject(local) || !isPlainObject(remote)) return local;
            const out: Record<string, unknown> = { ...remote, ...local };
            for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
                const l = local[key];
                const r = remote[key];
                if (isIdCollection(l) && isIdCollection(r)) {
                    out[key] = mergeById(l, r);
                } else if (isPlainObject(l) && isPlainObject(r)) {
                    // Nested groupings such as finance's { expense, income }.
                    out[key] = mergeValue('deep-merge', l, r);
                } else {
                    // A scalar: last-write-wins, local side.
                    out[key] = l === undefined ? r : l;
                }
            }
            return out;
        }

        case 'last-write-wins':
            return local;
    }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
    typeof v === 'object' && v !== null && !Array.isArray(v);

/** Parses a snapshot value, returning `undefined` for anything unreadable. */
function parse(raw: string | undefined): unknown {
    if (raw === undefined) return undefined;
    try { return JSON.parse(raw) as unknown; } catch { return undefined; }
}

/**
 * Merge this device's snapshot with the account's cloud copy.
 *
 * Every key present on **either** side appears in the result. A key the remote
 * has and the local does not is adopted wholesale — that is the case the old
 * code got wrong, and it is how a returning device recovers work done
 * elsewhere.
 */
export function mergeSnapshots(local: Snapshot, remote: Snapshot): Snapshot {
    const out: Snapshot = {};
    const keys = new Set([...Object.keys(local), ...Object.keys(remote)]);

    for (const key of keys) {
        const rawLocal = local[key];
        const rawRemote = remote[key];

        if (rawLocal === undefined) { out[key] = rawRemote!; continue; }
        if (rawRemote === undefined) { out[key] = rawLocal; continue; }
        if (rawLocal === rawRemote) { out[key] = rawLocal; continue; }

        const l = parse(rawLocal);
        const r = parse(rawRemote);

        // Unreadable JSON on one side: keep the side that parses, so a single
        // corrupt key cannot propagate over a good copy.
        if (l === undefined) { out[key] = rawRemote; continue; }
        if (r === undefined) { out[key] = rawLocal; continue; }

        const merged = mergeValue(policyFor(key), l, r);
        try {
            out[key] = JSON.stringify(merged);
        } catch {
            // Cyclic or otherwise unserialisable — keep what was already stored.
            out[key] = rawLocal;
        }
    }
    return out;
}
