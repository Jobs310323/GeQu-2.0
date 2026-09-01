import { describe, it, expect, afterEach } from 'vitest';
import {
    formatDate, formatTime, formatDateTime, formatRelativeDay,
    formatNumber, formatCurrency, compareText, pluralCategory,
    setCurrency, getCurrency,
} from './format';
import { todayKey, addDays } from './datetime';
import { setCurrentLocale } from '../i18n/locale';

/**
 * These tests are mostly about the seams between locales, because that is where
 * formatting quietly goes wrong: the decimal comma, the plural category count,
 * the currency symbol's side of the number. None of it is visible in English,
 * which is exactly why it has to be asserted.
 *
 * Note what is NOT asserted: the precise glyph a runtime chooses. ICU changes
 * its mind about narrow no-break spaces between releases, and pinning that
 * would make the suite fail on a Node upgrade for no user-visible reason.
 */

afterEach(() => { setCurrentLocale('en'); setCurrency('RUB'); });

describe('numbers', () => {
    it('uses the locale decimal separator', () => {
        setCurrentLocale('en');
        expect(formatNumber(6.5, 1)).toBe('6.5');
        setCurrentLocale('ru');
        expect(formatNumber(6.5, 1)).toBe('6,5');
    });

    it('groups thousands the way the locale does', () => {
        setCurrentLocale('en');
        expect(formatNumber(1234567)).toBe('1,234,567');
        setCurrentLocale('ru');
        // Russian groups with a space of some kind; which space is ICU's call.
        expect(formatNumber(1234567)).toMatch(/^1\s?234\s?567$/u);
    });

    it('does not print a fabricated number for a non-number', () => {
        expect(formatNumber(Number.NaN)).toBe('—');
        expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
    });
});

describe('currency', () => {
    it('is a separate choice from language', () => {
        // The case that motivates the whole design: a Russian speaker abroad.
        setCurrentLocale('ru');
        setCurrency('EUR');
        expect(getCurrency()).toBe('EUR');
        expect(formatCurrency(1200)).toContain('€');
        expect(formatCurrency(1200)).not.toContain('₽');
    });

    it('shows whole units by default, as the app has always stored them', () => {
        setCurrentLocale('ru');
        setCurrency('RUB');
        expect(formatCurrency(450)).not.toContain(',00');
    });

    it('ignores a code that is not three letters rather than throwing', () => {
        // `Intl.NumberFormat` throws on a bad currency code, and this value
        // arrives from a text input the user is still typing into.
        setCurrency('RUB');
        setCurrency('E');
        setCurrency('');
        setCurrency('12345');
        expect(getCurrency()).toBe('RUB');
        expect(() => formatCurrency(1)).not.toThrow();
    });

    it('normalises a lowercase code', () => {
        setCurrency('usd');
        expect(getCurrency()).toBe('USD');
    });
});

describe('dates', () => {
    it('renders a calendar date key without walking it a day backwards', () => {
        // `new Date('2026-03-15')` parses as UTC midnight, which is the 14th in
        // any timezone behind UTC. `formatDate` goes through `parseDateKey`.
        setCurrentLocale('en');
        expect(formatDate('2026-03-15', 'short')).toBe('03/15/2026');
        setCurrentLocale('ru');
        expect(formatDate('2026-03-15', 'short')).toBe('15.03.2026');
    });

    it('names months in the locale', () => {
        setCurrentLocale('ru');
        // Russian uses the genitive after a day number, which `Intl` knows and
        // a hand-rolled month table would not.
        expect(formatDate('2026-03-15', 'long')).toContain('марта');
        setCurrentLocale('en');
        expect(formatDate('2026-03-15', 'long')).toContain('March');
    });

    it('returns empty rather than "Invalid Date" for junk', () => {
        expect(formatDate('not-a-date')).toBe('');
        expect(formatTime('not-a-date')).toBe('');
        expect(formatDateTime('not-a-date')).toBe('');
    });
});

describe('relative days', () => {
    it('counts calendar days, not elapsed hours', () => {
        setCurrentLocale('en');
        // The case a millisecond-based implementation gets wrong: something
        // logged late last night is "yesterday" at 00:10, not "8 hours ago".
        expect(formatRelativeDay(addDays(todayKey(), -1))).toBe('yesterday');
        expect(formatRelativeDay(todayKey())).toBe('today');
        expect(formatRelativeDay(addDays(todayKey(), 1))).toBe('tomorrow');
    });

    it('coarsens the unit as the distance grows', () => {
        setCurrentLocale('en');
        expect(formatRelativeDay(addDays(todayKey(), -14))).toMatch(/week/);
        expect(formatRelativeDay(addDays(todayKey(), -100))).toMatch(/month/);
        expect(formatRelativeDay(addDays(todayKey(), -800))).toMatch(/year/);
    });

    it('speaks the active locale', () => {
        setCurrentLocale('ru');
        expect(formatRelativeDay(addDays(todayKey(), -1))).toBe('вчера');
    });
});

describe('plural categories', () => {
    it('gives Russian its three forms', () => {
        // This is why the hand-rolled `plural(n, one, few, many)` had to go: the
        // boundaries are not intuitive, and 11-14 are the trap.
        expect(pluralCategory(1, 'ru')).toBe('one');
        expect(pluralCategory(2, 'ru')).toBe('few');
        expect(pluralCategory(5, 'ru')).toBe('many');
        expect(pluralCategory(11, 'ru')).toBe('many');
        expect(pluralCategory(21, 'ru')).toBe('one');
        expect(pluralCategory(22, 'ru')).toBe('few');
    });

    it('gives English its two', () => {
        expect(pluralCategory(1, 'en')).toBe('one');
        expect(pluralCategory(0, 'en')).toBe('other');
        expect(pluralCategory(21, 'en')).toBe('other');
    });
});

describe('sorting', () => {
    it('orders text by the locale, not by code point', () => {
        setCurrentLocale('ru');
        const sorted = ['ёлка', 'яблоко', 'абрикос'].sort(compareText);
        expect(sorted[0]).toBe('абрикос');
        expect(sorted[2]).toBe('яблоко');
    });

    it('compares embedded numbers as numbers', () => {
        setCurrentLocale('en');
        const sorted = ['item 10', 'item 2'].sort(compareText);
        expect(sorted).toEqual(['item 2', 'item 10']);
    });
});
