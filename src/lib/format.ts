// Locale-aware display formatting.
//
// The division of labour with `lib/datetime.ts` is deliberate and worth
// keeping: `datetime.ts` decides *which day a record belongs to* in the user's
// timezone and never formats anything for display; this module formats for
// display and never decides what a date means. Merging them would blur the
// one distinction `datetime.ts` exists to enforce.
//
// Everything here is `Intl`. i18next selects the string; it does not format
// the values inside it — a library's own date/number layer is one more thing
// to be subtly wrong about Russian genitive months or narrow no-break spaces,
// and the platform already gets those right.

import { getLocale, type Locale } from '../i18n/locale';
import { parseDateKey, todayKey, daysBetween, type DateKey } from './datetime';

/** The user's chosen currency. Not derived from locale — see `setCurrency`. */
let currency = 'RUB';

/**
 * Currency is a separate choice from language.
 *
 * A Russian speaker in Berlin spends euros and an English speaker in Moscow
 * spends roubles; deriving one from the other gets both wrong. Existing users
 * keep RUB, which is what the hardcoded `₽` in Finance always meant.
 */
export function setCurrency(code: string): void {
    if (/^[A-Za-z]{3}$/.test(code)) currency = code.toUpperCase();
}

export function getCurrency(): string {
    return currency;
}

// Intl formatters are expensive to construct and are built per row in lists,
// so every one of them is memoised on its own arguments.
function memo<T>(build: (locale: Locale, key: string) => T) {
    const cache = new Map<string, T>();
    return (key: string, locale: Locale = getLocale()): T => {
        const id = `${locale}:${key}`;
        let hit = cache.get(id);
        if (hit === undefined) {
            hit = build(locale, key);
            cache.set(id, hit);
        }
        return hit;
    };
}

type DateStyle = 'short' | 'medium' | 'long' | 'weekday' | 'dayMonth' | 'monthYear';

const DATE_OPTIONS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    weekday: { weekday: 'short', day: 'numeric', month: 'short' },
    dayMonth: { day: 'numeric', month: 'short' },
    monthYear: { month: 'long', year: 'numeric' },
};

const dateFormatter = memo((locale, style) =>
    new Intl.DateTimeFormat(locale, DATE_OPTIONS[style as DateStyle]));

const timeFormatter = memo((locale, withSeconds) =>
    new Intl.DateTimeFormat(locale, withSeconds === 'seconds'
        ? { hour: '2-digit', minute: '2-digit', second: '2-digit' }
        : { hour: '2-digit', minute: '2-digit' }));

const relativeFormatter = memo(locale =>
    new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));

const numberFormatter = memo((locale, digits) =>
    new Intl.NumberFormat(locale, {
        minimumFractionDigits: Number(digits),
        maximumFractionDigits: Number(digits),
    }));

const currencyFormatter = memo((locale, key) => {
    const [code, digits] = key.split('|');
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: code,
        minimumFractionDigits: Number(digits),
        maximumFractionDigits: Number(digits),
    });
});

const collators = memo(locale => new Intl.Collator(locale, { sensitivity: 'base', numeric: true }));

/** A calendar date or instant, rendered for reading. */
export function formatDate(value: DateKey | Date | number, style: DateStyle = 'medium', locale?: Locale): string {
    const date = typeof value === 'string' ? parseDateKey(value) : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return dateFormatter(style, locale).format(date);
}

export function formatTime(value: Date | string | number, withSeconds = false, locale?: Locale): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return timeFormatter(withSeconds ? 'seconds' : 'minutes', locale).format(date);
}

export function formatDateTime(value: Date | string | number, style: DateStyle = 'medium', locale?: Locale): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${formatDate(date.getTime(), style, locale)}, ${formatTime(date, false, locale)}`;
}

/**
 * "yesterday", "in 3 days", "2 weeks ago".
 *
 * Measured in whole *calendar* days via `daysBetween`, not in elapsed
 * milliseconds: something logged at 23:50 is "yesterday" at 00:10, not
 * "20 minutes ago", and only the calendar comparison says so.
 */
export function formatRelativeDay(value: DateKey | Date | number, locale?: Locale): string {
    const key: DateKey = typeof value === 'string'
        ? value
        : new Intl.DateTimeFormat('en-CA').format(new Date(value));
    const days = daysBetween(todayKey(), key);
    const rtf = relativeFormatter('day', locale);

    if (Math.abs(days) < 7) return rtf.format(days, 'day');
    if (Math.abs(days) < 30) return rtf.format(Math.trunc(days / 7), 'week');
    if (Math.abs(days) < 365) return rtf.format(Math.trunc(days / 30), 'month');
    return rtf.format(Math.trunc(days / 365), 'year');
}

export function formatNumber(value: number, digits = 0, locale?: Locale): string {
    if (!Number.isFinite(value)) return '—';
    return numberFormatter(String(digits), locale).format(value);
}

/**
 * Money, with the currency symbol placed where the locale puts it.
 *
 * Amounts in this app are whole units — the Finance screen has always shown
 * them without decimals — so the default is 0 fraction digits rather than the
 * currency's own default of 2, which would turn every figure into `1 234,00 ₽`.
 */
export function formatCurrency(value: number, digits = 0, code = currency, locale?: Locale): string {
    if (!Number.isFinite(value)) return '—';
    return currencyFormatter(`${code}|${digits}`, locale).format(value);
}

/** Locale-correct sorting. `[...items].sort(compareText)` — never bare `.sort()` on text. */
export function compareText(a: string, b: string, locale?: Locale): number {
    return collators('default', locale).compare(a, b);
}

/** The plural category for `count`, for tests and for anything not going through `t()`. */
export function pluralCategory(count: number, locale: Locale = getLocale()): Intl.LDMLPluralRule {
    return new Intl.PluralRules(locale).select(count);
}

/**
 * Which day the week starts on, 1 = Monday … 7 = Sunday.
 *
 * Not a detail: a calendar grid that starts on the wrong day puts every date in
 * the wrong column. Russian weeks start on Monday, American ones on Sunday, and
 * the app had Monday hardcoded.
 *
 * `getWeekInfo()` is the standard answer and is not everywhere yet, so a locale
 * the runtime cannot describe falls back to Monday — the ISO-8601 default and
 * what this app has always done.
 */
export function firstDayOfWeek(locale: Locale = getLocale()): number {
    try {
        const info = (new Intl.Locale(locale) as Intl.Locale & {
            getWeekInfo?: () => { firstDay: number };
            weekInfo?: { firstDay: number };
        });
        return info.getWeekInfo?.().firstDay ?? info.weekInfo?.firstDay ?? 1;
    } catch {
        return 1;
    }
}

const weekdayFormatter = memo((locale, width) =>
    new Intl.DateTimeFormat(locale, { weekday: width as 'short' | 'narrow' | 'long' }));

/**
 * Weekday headers in the order this locale's calendar shows them.
 *
 * Built from real dates rather than a name table: 2024-01-01 was a Monday, so
 * offsetting from it gives every weekday in one pass, correctly capitalised and
 * abbreviated by the platform for whichever language is active.
 */
export function weekdayNames(width: 'short' | 'narrow' | 'long' = 'short', locale?: Locale): string[] {
    const first = firstDayOfWeek(locale);
    const monday = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
        const day = new Date(monday);
        day.setDate(monday.getDate() + ((first - 1 + i) % 7));
        return weekdayFormatter(width, locale).format(day);
    });
}

/** How many blank cells precede the 1st of `date`'s month in a week grid. */
export function monthStartOffset(date: Date, locale?: Locale): number {
    // `getDay()` is 0 = Sunday; the week-info convention is 1 = Monday … 7 = Sunday.
    const weekday = new Date(date.getFullYear(), date.getMonth(), 1).getDay() || 7;
    return (weekday - firstDayOfWeek(locale) + 7) % 7;
}

const monthFormatter = memo(locale => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }));

/** "March 2026" / "март 2026", in whatever order and case the locale wants. */
export function monthAndYear(date: Date, locale?: Locale): string {
    return monthFormatter('long', locale).format(date);
}
