// One definition of "what day is it" for the whole app.
//
// Every page used to write `new Date().toISOString().split('T')[0]`, which is
// the date in UTC. For a user at UTC+3 that is the *previous* day between
// 00:00 and 03:00 local — so a check-in closed at 1 AM was filed to yesterday,
// `alreadyClosed` said the day was already done, and the streak skipped a day.
// For an app built around evening reflection, and for an audience that is
// disproportionately awake at 1 AM, that is the wrong day often enough to
// matter.
//
// So: dates are the user's calendar dates. Timestamps stay full ISO (they are
// instants, and UTC is right for those); only the day they are filed under is
// computed locally.

export const DAY_MS = 86_400_000;

const BARE_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The local calendar day of `value`, as `YYYY-MM-DD`.
 *
 * A string that is already a bare date comes back untouched — it carries no
 * time zone to convert, and parsing it would treat it as UTC midnight and shift
 * it a day west of Greenwich.
 */
export function dayISO(value: Date | string | number = new Date()): string {
    if (typeof value === 'string') {
        if (BARE_DATE.test(value)) return value;
        if (!value) return '';
    }
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/** Today, as the user's calendar sees it. */
export const todayISO = (): string => dayISO();

/** `n` days before `date` (default today), as a local calendar date. */
export function shiftDays(n: number, date: Date | string = new Date()): string {
    const base = typeof date === 'string' ? new Date(`${dayISO(date)}T12:00:00`) : new Date(date);
    base.setDate(base.getDate() + n);
    return dayISO(base);
}
