import { describe, it, expect, vi, afterEach } from 'vitest';
import {
    toLocalDateKey, todayKey, startOfLocalDay, parseDateKey, addDays,
    daysBetween, isSameLocalDay, isToday, instantForDateKey, recentDateKeys,
    streakLength, localTimeZone,
} from './datetime';

/**
 * These tests exist because of a real bug: `new Date().toISOString().split('T')[0]`
 * appeared at 35 sites and yields the *UTC* date, so every user not on UTC filed
 * entries under the wrong day for part of every day. Check-ins, habits and
 * streaks were all affected.
 *
 * So the cases below are not generic date exercises — each one reproduces a way
 * that bug manifested, and would fail again if the UTC shortcut came back.
 */

afterEach(() => vi.useRealTimers());

/** Freeze the clock at a precise instant. */
function at(iso: string) {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(iso));
}

describe('toLocalDateKey', () => {
    it('uses the local calendar day, not the UTC one', () => {
        // 23:30 local on the 28th. `toISOString()` on this instant renders the
        // 29th for anyone far enough east, which is exactly the old bug.
        const local = new Date(2026, 7, 28, 23, 30);
        expect(toLocalDateKey(local)).toBe('2026-08-28');
    });

    it('returns a bare date key untouched', () => {
        // Round-tripping through Date would break this: `new Date('2026-08-28')`
        // parses as UTC midnight, which is the 27th anywhere behind UTC. Habit
        // history stores bare keys, so it would walk one day backwards on every
        // read.
        expect(toLocalDateKey('2026-08-28')).toBe('2026-08-28');
    });

    it('pads single-digit months and days', () => {
        expect(toLocalDateKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
    });

    it('returns an empty string for an unparseable value rather than "NaN-NaN-NaN"', () => {
        expect(toLocalDateKey('not a date')).toBe('');
        expect(toLocalDateKey(Number.NaN)).toBe('');
    });

    it('accepts an epoch number', () => {
        const d = new Date(2026, 4, 17, 9, 15);
        expect(toLocalDateKey(d.getTime())).toBe('2026-05-17');
    });
});

describe('todayKey', () => {
    it('is the local date even when the UTC date differs', () => {
        // 2026-08-28T23:30Z. In UTC this is the 28th; the assertion below is
        // written against whatever local zone the test runs in, so it holds
        // everywhere — including the CI runner, which is UTC.
        at('2026-08-28T23:30:00Z');
        const now = new Date();
        expect(todayKey()).toBe(
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        );
    });
});

describe('parseDateKey', () => {
    it('lands at local noon, clear of every DST transition', () => {
        const d = parseDateKey('2026-03-29');   // EU spring-forward morning
        expect(d.getHours()).toBe(12);
        expect(d.getFullYear()).toBe(2026);
        expect(d.getMonth()).toBe(2);
        expect(d.getDate()).toBe(29);
    });

    it('round-trips through toLocalDateKey', () => {
        for (const key of ['2026-01-01', '2026-03-29', '2026-10-25', '2026-12-31']) {
            expect(toLocalDateKey(parseDateKey(key))).toBe(key);
        }
    });
});

describe('addDays', () => {
    it('crosses a month boundary', () => {
        expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('crosses a year boundary', () => {
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('goes backwards', () => {
        expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    });

    it('handles a leap day', () => {
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
        expect(addDays('2028-02-29', 1)).toBe('2028-03-01');
    });

    it('steps one calendar day across a DST transition, not 24 hours', () => {
        // On a spring-forward day the calendar advances by one even though only
        // 23 hours elapse. Adding 86_400_000ms would skip to the 30th.
        expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
        expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    });
});

describe('daysBetween', () => {
    it('is positive when the second date is later', () => {
        expect(daysBetween('2026-08-01', '2026-08-05')).toBe(4);
    });

    it('is negative going backwards', () => {
        expect(daysBetween('2026-08-05', '2026-08-01')).toBe(-4);
    });

    it('is zero for the same day', () => {
        expect(daysBetween('2026-08-05', '2026-08-05')).toBe(0);
    });

    it('counts whole days across a DST boundary', () => {
        // The interval is 23 or 25 real hours; the answer is still 1 day.
        expect(daysBetween('2026-03-28', '2026-03-29')).toBe(1);
        expect(daysBetween('2026-10-24', '2026-10-25')).toBe(1);
    });
});

describe('startOfLocalDay', () => {
    it('is local midnight', () => {
        const d = startOfLocalDay(new Date(2026, 7, 28, 17, 45, 30));
        expect(d.getHours()).toBe(0);
        expect(d.getMinutes()).toBe(0);
        expect(d.getDate()).toBe(28);
    });

    it('does not mutate its argument', () => {
        // The reason this function exists: `setHours(0,0,0,0)` on a shared Date
        // silently rewrites the caller's value.
        const original = new Date(2026, 7, 28, 17, 45);
        const copy = new Date(original);
        startOfLocalDay(original);
        expect(original.getTime()).toBe(copy.getTime());
    });
});

describe('isSameLocalDay / isToday', () => {
    it('compares by local day, not by instant', () => {
        expect(isSameLocalDay(new Date(2026, 7, 28, 0, 1), new Date(2026, 7, 28, 23, 59))).toBe(true);
        expect(isSameLocalDay(new Date(2026, 7, 28, 23, 59), new Date(2026, 7, 29, 0, 1))).toBe(false);
    });

    it('isToday follows the frozen clock', () => {
        at('2026-08-28T12:00:00Z');
        expect(isToday(new Date())).toBe(true);
        expect(isToday(addDays(todayKey(), -1))).toBe(false);
    });
});

describe('instantForDateKey', () => {
    it('stores the real instant when filing under today', () => {
        at('2026-08-28T12:34:56Z');
        expect(instantForDateKey(todayKey())).toBe('2026-08-28T12:34:56.000Z');
    });

    it('back-dating round-trips to the day the user chose', () => {
        // The whole point: whatever the timezone, reading the stored instant
        // back through toLocalDateKey must return the chosen day.
        at('2026-08-28T12:00:00Z');
        const chosen = '2026-08-20';
        expect(toLocalDateKey(instantForDateKey(chosen))).toBe(chosen);
    });
});

describe('recentDateKeys', () => {
    it('ends today and runs oldest first', () => {
        at('2026-08-28T12:00:00Z');
        const keys = recentDateKeys(7);
        expect(keys).toHaveLength(7);
        expect(keys[6]).toBe(todayKey());
        expect(keys[0]).toBe(addDays(todayKey(), -6));
        expect([...keys].sort()).toEqual(keys);
    });

    it('returns just today for a window of 1', () => {
        at('2026-08-28T12:00:00Z');
        expect(recentDateKeys(1)).toEqual([todayKey()]);
    });
});

describe('streakLength', () => {
    it('is zero for no values', () => {
        expect(streakLength([])).toBe(0);
    });

    it('counts a run ending today', () => {
        at('2026-08-28T12:00:00Z');
        const t = todayKey();
        expect(streakLength([t, addDays(t, -1), addDays(t, -2)])).toBe(3);
    });

    it('survives until the day is actually missed', () => {
        // A streak ending yesterday is still live — today is not over yet.
        // Ending it at midnight would punish the user for not having logged
        // before lunchtime.
        at('2026-08-28T12:00:00Z');
        const y = addDays(todayKey(), -1);
        expect(streakLength([y, addDays(y, -1)])).toBe(2);
    });

    it('is zero once a day has been missed', () => {
        at('2026-08-28T12:00:00Z');
        const old = addDays(todayKey(), -2);
        expect(streakLength([old, addDays(old, -1)])).toBe(0);
    });

    it('counts only the unbroken run, ignoring older clusters', () => {
        at('2026-08-28T12:00:00Z');
        const t = todayKey();
        expect(streakLength([t, addDays(t, -1), addDays(t, -5), addDays(t, -6)])).toBe(2);
    });

    it('deduplicates several entries on the same day', () => {
        at('2026-08-28T12:00:00Z');
        const t = todayKey();
        expect(streakLength([t, t, t, addDays(t, -1)])).toBe(2);
    });

    it('accepts instants and date keys mixed together', () => {
        at('2026-08-28T12:00:00Z');
        const t = todayKey();
        expect(streakLength([new Date(), addDays(t, -1), addDays(t, -2)])).toBe(3);
    });

    it('ignores unparseable values instead of breaking the run', () => {
        at('2026-08-28T12:00:00Z');
        const t = todayKey();
        expect(streakLength(['nonsense', t, addDays(t, -1)])).toBe(2);
    });
});

describe('localTimeZone', () => {
    it('returns the runtime IANA zone', () => {
        expect(localTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    });

    it('falls back to UTC when the runtime reports no zone', () => {
        const spy = vi.spyOn(Intl, 'DateTimeFormat').mockReturnValue({
            resolvedOptions: () => ({ timeZone: '' }),
        } as unknown as Intl.DateTimeFormat);
        expect(localTimeZone()).toBe('UTC');
        spy.mockRestore();
    });

    it('falls back to UTC rather than throwing when Intl is unavailable', () => {
        // Some embedded webviews ship without full ICU. Losing the zone label is
        // survivable; taking the app down on startup is not.
        const spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(() => {
            throw new Error('no ICU');
        });
        expect(localTimeZone()).toBe('UTC');
        spy.mockRestore();
    });
});

describe('toLocalDateKey defensive paths', () => {
    it('handles an invalid Date object', () => {
        expect(toLocalDateKey(new Date('nope'))).toBe('');
    });

    it('parseDateKey survives a malformed key instead of producing Invalid Date', () => {
        // Stored data can be older than the current format. A garbage key must
        // yield a real Date, not one that poisons every comparison downstream.
        const d = parseDateKey('');
        expect(Number.isNaN(d.getTime())).toBe(false);
    });
});
