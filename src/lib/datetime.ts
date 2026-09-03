// Date and time handling for GeQu.
//
// The distinction this module exists to enforce:
//
//   INSTANT        a precise moment, stored as a full ISO-8601 string.
//                  "when did this happen" — timestamps on records.
//   CALENDAR DATE  a day in the *user's* timezone, as "YYYY-MM-DD".
//                  "which day does this belong to" — check-ins, habits,
//                  streaks, calendar cells, daily records.
//
// Converting between them is where the app used to be wrong. `toISOString()`
// always renders UTC, so `new Date().toISOString().split('T')[0]` is the UTC
// date, not the user's. For anyone east of UTC that misfiles everything before
// their local 03:00 (at UTC+3) under yesterday; for anyone west, everything
// after 19:00 (at UTC-5) under tomorrow. Streaks break, habits look unticked,
// and the day's check-in lands on the wrong record.
//
// Two places in the app had already worked this out locally and used
// `toLocaleDateString('sv-SE')` with a comment saying why — the fix was simply
// never propagated. This module is that fix, propagated, and is the only
// sanctioned way to derive a calendar date.
//
// Rules:
//   * store instants with `nowInstant()`; never store a UTC-derived day key
//   * derive day keys at *read* time with `toLocalDateKey()` so existing
//     records reinterpret correctly without being rewritten
//   * never call `toISOString()` to get a date for comparison or display

/** A calendar date in the user's timezone, formatted `YYYY-MM-DD`. */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

/** Matches a bare calendar date with no time part. */
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Coerces the accepted input shapes to a Date. Invalid input yields an invalid Date. */
function asDate(value: Date | string | number): Date {
    return value instanceof Date ? value : new Date(value);
}

/**
 * The calendar date `value` falls on, in the user's local timezone.
 *
 * Built from the local getters rather than `toISOString()` (always UTC) or
 * `toLocaleDateString('sv-SE')` (correct, but depends on the runtime shipping
 * that locale's data).
 *
 * A value that is *already* a calendar date is returned untouched. This matters:
 * habit history and reminders store bare `YYYY-MM-DD`, and
 * `new Date('2026-08-28')` parses as UTC midnight — which in any timezone behind
 * UTC is the evening of the 27th, so round-tripping one through a Date would
 * walk it a day backwards every time.
 */
export function toLocalDateKey(value: Date | string | number): DateKey {
    if (typeof value === 'string' && DATE_KEY_RE.test(value)) return value;
    const d = asDate(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's calendar date in the user's timezone. */
export function todayKey(): DateKey {
    return toLocalDateKey(new Date());
}

/** An ISO-8601 instant for storing on a record. This is the correct use of `toISOString()`. */
export function nowInstant(): string {
    return new Date().toISOString();
}

/**
 * Midnight at the start of `value`'s local day.
 * Use this for day-boundary arithmetic instead of `setHours(0,0,0,0)` on a
 * shared Date, which mutates its argument.
 */
export function startOfLocalDay(value: Date | string | number): Date {
    const d = asDate(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * A `DateKey` back to a Date at local noon.
 *
 * Noon, not midnight: `new Date('2026-03-29')` parses as UTC midnight, which in
 * a timezone that springs forward that morning can land on the previous day.
 * Noon is at least 11 hours clear of every real DST transition.
 */
export function parseDateKey(key: DateKey): Date {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0);
}

/** `key` shifted by `days` (negative shifts backwards), staying on calendar days across DST. */
export function addDays(key: DateKey, days: number): DateKey {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + days);
    return toLocalDateKey(d);
}

/** Whole calendar days from `from` to `to`. Positive when `to` is later. */
export function daysBetween(from: DateKey, to: DateKey): number {
    const ms = parseDateKey(to).getTime() - parseDateKey(from).getTime();
    return Math.round(ms / 86_400_000);
}

/** True when both values fall on the same local calendar day. */
export function isSameLocalDay(a: Date | string | number, b: Date | string | number): boolean {
    return toLocalDateKey(a) === toLocalDateKey(b);
}

/** True when `value` falls on today's local calendar day. */
export function isToday(value: Date | string | number): boolean {
    return toLocalDateKey(value) === todayKey();
}

/**
 * The instant to store for an entry the user is filing under `key`.
 *
 * Filing under today stores the actual current instant. Back-dating stores
 * local noon of that day, so the record's own local date key round-trips to the
 * day the user chose regardless of their timezone.
 */
export function instantForDateKey(key: DateKey): string {
    return key === todayKey() ? nowInstant() : parseDateKey(key).toISOString();
}

/** The user's IANA timezone, for display and for storing alongside records. */
export function localTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

/**
 * The last `count` calendar dates ending today, oldest first.
 * Used by every trailing-window chart and streak calculation.
 */
export function recentDateKeys(count: number): DateKey[] {
    const today = todayKey();
    return Array.from({ length: count }, (_, i) => addDays(today, i - count + 1));
}

/**
 * Length of the run of consecutive days ending today (or yesterday, so a streak
 * survives until the day is actually missed) in `values`.
 *
 * `values` may hold instants or date keys; both are normalised to local dates.
 * This is the one streak implementation — it previously existed in several
 * places, each with its own UTC handling.
 */
export function streakLength(values: Array<Date | string | number>): number {
    const days = [...new Set(values.map(toLocalDateKey))].filter(Boolean).sort().reverse();
    const first = days[0];
    if (!first) return 0;

    const today = todayKey();
    // Anchored to today or yesterday; anything older means the streak is over.
    if (first !== today && first !== addDays(today, -1)) return 0;

    let streak = 1;
    for (let i = 0; i < days.length - 1; i++) {
        if (daysBetween(days[i + 1]!, days[i]!) === 1) streak++;
        else break;
    }
    return streak;
}
