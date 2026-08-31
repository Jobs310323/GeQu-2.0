import { describe, it, expect } from 'vitest';
import { mergeSnapshots, mergeById, policyFor, POLICY } from './merge';
import type { Snapshot } from './cloud';

/**
 * The scenario these tests exist for, in full:
 *
 *   1. User works on their laptop. Cloud holds the laptop's data.
 *   2. User picks up their phone. It pulls, they add three tasks, it pushes.
 *   3. User reopens the laptop.
 *
 * Before this module, step 3 was catastrophic: `CloudSync` only pulled when the
 * *account* changed, so the laptop never re-read the cloud. Its first edit
 * pushed its own stale snapshot and the three tasks from the phone were gone,
 * permanently and without warning.
 *
 * Every test below is a way that could happen.
 */

const snap = (obj: Record<string, unknown>): Snapshot =>
    Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, JSON.stringify(v)]));

const read = <T,>(s: Snapshot, key: string): T => JSON.parse(s[key]!) as T;

describe('the bug this module exists to fix', () => {
    it('a stale device does not erase work done on another device', () => {
        const laptop = snap({ gequ_kanban: [{ id: 1, text: 'старая задача' }] });
        const cloud = snap({
            gequ_kanban: [
                { id: 1, text: 'старая задача' },
                { id: 2, text: 'с телефона' },
                { id: 3, text: 'тоже с телефона' },
            ],
        });

        const merged = mergeSnapshots(laptop, cloud);
        const tasks = read<{ id: number }[]>(merged, 'gequ_kanban');
        expect(tasks.map(t => t.id).sort()).toEqual([1, 2, 3]);
    });

    it('adopts a whole key the local device has never seen', () => {
        // The returning device has no journal at all; the cloud does. Before,
        // the local snapshot simply overwrote it into nonexistence.
        const laptop = snap({ gequ_kanban: [] });
        const cloud = snap({ gequ_diary: [{ id: 9, date: '2026-08-01', content: 'запись' }] });

        const merged = mergeSnapshots(laptop, cloud);
        expect(read<unknown[]>(merged, 'gequ_diary')).toHaveLength(1);
    });

    it('keeps additions from BOTH sides when each has been used offline', () => {
        const laptop = snap({ gequ_kanban: [{ id: 1 }, { id: 2 }] });
        const phone = snap({ gequ_kanban: [{ id: 1 }, { id: 3 }] });

        const merged = mergeSnapshots(laptop, phone);
        expect(read<{ id: number }[]>(merged, 'gequ_kanban').map(t => t.id).sort()).toEqual([1, 2, 3]);
    });

    it('is symmetric in what it preserves, whichever device merges', () => {
        const a = snap({ gequ_kanban: [{ id: 1 }, { id: 2 }] });
        const b = snap({ gequ_kanban: [{ id: 3 }] });

        const ids = (s: Snapshot) => read<{ id: number }[]>(s, 'gequ_kanban').map(t => t.id).sort();
        expect(ids(mergeSnapshots(a, b))).toEqual([1, 2, 3]);
        expect(ids(mergeSnapshots(b, a))).toEqual([1, 2, 3]);
    });
});

describe('append-only keys', () => {
    it.each(['gequ_diary', 'gequ_logs', 'gequ_tests', 'gequ_clinical', 'gequ_cbt', 'gequ_snowmanDays'])(
        '%s never loses a record from either side',
        key => {
            const local = snap({ [key]: [{ id: 1 }, { id: 2 }] });
            const remote = snap({ [key]: [{ id: 2 }, { id: 3 }] });
            const merged = mergeSnapshots(local, remote);
            expect(read<{ id: number }[]>(merged, key).map(r => r.id).sort()).toEqual([1, 2, 3]);
        },
    );

    it('an empty local list does not wipe the cloud history', () => {
        // A freshly-cleared browser must not be able to delete a year of logs.
        const fresh = snap({ gequ_logs: [] });
        const cloud = snap({ gequ_logs: [{ id: 1 }, { id: 2 }, { id: 3 }] });
        expect(read<unknown[]>(mergeSnapshots(fresh, cloud), 'gequ_logs')).toHaveLength(3);
    });
});

describe('merge-by-id collisions', () => {
    it('prefers the copy that says it is newer', () => {
        const local = [{ id: 1, text: 'локально', updatedAt: '2026-08-01T10:00:00Z' }];
        const remote = [{ id: 1, text: 'удалённо', updatedAt: '2026-08-02T10:00:00Z' }];
        expect(mergeById(local, remote)[0]).toMatchObject({ text: 'удалённо' });
    });

    it('prefers local when neither side states a time', () => {
        // No `updatedAt` anywhere in the stored data yet, so recency is
        // unknowable. The device the user is holding is the better guess.
        const local = [{ id: 1, text: 'локально' }];
        const remote = [{ id: 1, text: 'удалённо' }];
        expect(mergeById(local, remote)[0]).toMatchObject({ text: 'локально' });
    });

    it('prefers local when only the remote states a time', () => {
        // A half-migrated pair proves nothing about ordering.
        const local = [{ id: 1, text: 'локально' }];
        const remote = [{ id: 1, text: 'удалённо', updatedAt: '2099-01-01T00:00:00Z' }];
        expect(mergeById(local, remote)[0]).toMatchObject({ text: 'локально' });
    });

    it('treats a numeric and a string id as the same record', () => {
        const merged = mergeById([{ id: 1 }], [{ id: '1' }]);
        expect(merged).toHaveLength(1);
    });

    it('keeps remote ordering, appending local-only records after', () => {
        const merged = mergeById([{ id: 3 }, { id: 1 }], [{ id: 1 }, { id: 2 }]);
        expect(merged.map(r => r.id)).toEqual([1, 2, 3]);
    });
});

describe('deep-merge keys', () => {
    it('finance merges each collection and keeps both sides entries', () => {
        const local = snap({
            gequ_finance: {
                pin: null, initialBalance: 100,
                categories: { expense: [{ id: 'food' }], income: [{ id: 'salary' }] },
                entries: [{ id: 1 }], debts: [], subscriptions: [],
            },
        });
        const remote = snap({
            gequ_finance: {
                pin: null, initialBalance: 100,
                categories: { expense: [{ id: 'food' }, { id: 'fun' }], income: [{ id: 'salary' }] },
                entries: [{ id: 2 }], debts: [{ id: 7 }], subscriptions: [],
            },
        });

        const f = read<{
            entries: { id: number }[]; debts: { id: number }[];
            categories: { expense: { id: string }[] };
        }>(mergeSnapshots(local, remote), 'gequ_finance');

        expect(f.entries.map(e => e.id).sort()).toEqual([1, 2]);
        expect(f.debts.map(d => d.id)).toEqual([7]);
        expect(f.categories.expense.map(c => c.id).sort()).toEqual(['food', 'fun']);
    });

    it('gym merges programs and history, and takes local for the active pointer', () => {
        const local = snap({ gequ_gym: { programs: [{ id: 1 }], history: [{ id: 10 }], activeProgramId: 1 } });
        const remote = snap({ gequ_gym: { programs: [{ id: 2 }], history: [{ id: 11 }], activeProgramId: 2 } });

        const g = read<{ programs: { id: number }[]; history: { id: number }[]; activeProgramId: number }>(
            mergeSnapshots(local, remote), 'gequ_gym');

        expect(g.programs.map(p => p.id).sort()).toEqual([1, 2]);
        expect(g.history.map(h => h.id).sort()).toEqual([10, 11]);
        // A scalar preference, not a record: the device in hand wins.
        expect(g.activeProgramId).toBe(1);
    });
});

describe('last-write-wins keys', () => {
    it('takes the local value for settings', () => {
        const merged = mergeSnapshots(snap({ gequ_theme: 'light' }), snap({ gequ_theme: 'dark' }));
        expect(read<string>(merged, 'gequ_theme')).toBe('light');
    });

    it('still adopts a setting the local device has never had', () => {
        const merged = mergeSnapshots(snap({}), snap({ gequ_theme: 'dark' }));
        expect(read<string>(merged, 'gequ_theme')).toBe('dark');
    });
});

describe('policy table', () => {
    it('defaults an unknown key to last-write-wins, favouring local', () => {
        // A key added by a newer build must never vanish because this build's
        // POLICY table has not heard of it.
        expect(policyFor('gequ_something_new')).toBe('last-write-wins');
        const merged = mergeSnapshots(snap({ gequ_new: { a: 1 } }), snap({ gequ_new: { a: 2 } }));
        expect(read<{ a: number }>(merged, 'gequ_new').a).toBe(1);
    });

    it('every collection key in the app has an explicit policy', () => {
        // A collection silently defaulting to last-write-wins is the original
        // bug in miniature, so the table must stay in step with the stores.
        for (const key of [
            'gequ_kanban', 'gequ_goals', 'gequ_habits', 'gequ_reminders', 'gequ_logs',
            'gequ_diary', 'gequ_tests', 'gequ_clinical', 'gequ_cbt', 'gequ_circles',
            'gequ_snowmanLabels', 'gequ_snowmanDays', 'gequ_finance', 'gequ_gym',
        ]) {
            expect(POLICY[key], `${key} has no policy`).toBeDefined();
            expect(POLICY[key]).not.toBe('last-write-wins');
        }
    });
});

describe('malformed input', () => {
    it('keeps the side that parses when the other is corrupt', () => {
        const local: Snapshot = { gequ_kanban: '{not json' };
        const remote = snap({ gequ_kanban: [{ id: 1 }] });
        expect(read<unknown[]>(mergeSnapshots(local, remote), 'gequ_kanban')).toHaveLength(1);
    });

    it('does not let a corrupt remote overwrite good local data', () => {
        const local = snap({ gequ_kanban: [{ id: 1 }] });
        const remote: Snapshot = { gequ_kanban: 'oops' };
        expect(read<unknown[]>(mergeSnapshots(local, remote), 'gequ_kanban')).toHaveLength(1);
    });

    it('keeps local when a collection key holds something that is not a collection', () => {
        // Stored data older than the current model, or hand-edited.
        const local = snap({ gequ_kanban: { legacy: true } });
        const remote = snap({ gequ_kanban: [{ id: 1 }] });
        expect(read<{ legacy: boolean }>(mergeSnapshots(local, remote), 'gequ_kanban').legacy).toBe(true);
    });

    it('handles records missing an id without dropping the rest', () => {
        const local = snap({ gequ_kanban: [{ id: 1 }, { text: 'без id' }] });
        const remote = snap({ gequ_kanban: [{ id: 2 }] });
        // The shape does not satisfy the policy, so local is kept intact
        // rather than partially merged into something lossy.
        expect(read<unknown[]>(mergeSnapshots(local, remote), 'gequ_kanban')).toHaveLength(2);
    });
});

describe('identity', () => {
    it('merging a snapshot with itself changes nothing', () => {
        const s = snap({
            gequ_kanban: [{ id: 1 }, { id: 2 }],
            gequ_logs: [{ id: 5 }],
            gequ_theme: 'dark',
        });
        expect(mergeSnapshots(s, s)).toEqual(s);
    });

    it('merging with an empty remote returns the local snapshot', () => {
        const s = snap({ gequ_kanban: [{ id: 1 }], gequ_theme: 'dark' });
        expect(mergeSnapshots(s, {})).toEqual(s);
    });

    it('merging an empty local with a remote adopts it wholesale', () => {
        // A brand-new device signing in.
        const cloud = snap({ gequ_kanban: [{ id: 1 }], gequ_logs: [{ id: 2 }] });
        expect(mergeSnapshots({}, cloud)).toEqual(cloud);
    });
});
