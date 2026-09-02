// Validated screening questionnaires, with their real scoring rules.
//
// Scoring is implemented per instrument rather than as a generic sum: ASRS
// Part A uses per-item thresholds, PSS-10 reverses four items, and WHO-5
// multiplies the raw score by 4. Getting these wrong would quietly produce
// meaningless numbers, so each one is spelled out.
//
// The wording IS the instrument (see ADR-006), so it is kept separate from
// the scoring here and entered per locale as real content in
// `instruments/{ru,en}.ts` — never machine-translated. This file defines the
// scoring, which is locale-independent, and merges it with whichever
// locale's wording is available. An instrument without validated wording for
// a locale is left out of `clinicalTests(locale)` rather than shown with
// another language's text silently substituted; `unavailableInstruments`
// exists so the screen can say so visibly instead of just being shorter.

import { lastOf, type NonEmptyArray } from './nonEmpty';
import type { Locale } from '../i18n/locale';
import { ru } from './instruments/ru';
import { en } from './instruments/en';
import type { InstrumentText, InstrumentTextBundle } from './instruments/types';

export type Option = { text: string; val: number };
export type Band = { min: number; max: number; label: string; tone: 'good' | 'mild' | 'moderate' | 'high' };

export type ClinicalTest = {
    id: string;
    name: string;
    short: string;
    intro: string;
    period: string;
    questions: string[];
    options: Option[];
    /** Indices (0-based) whose scale is reversed before summing. */
    reversed?: number[];
    /** ASRS-style: count items crossing a per-item threshold instead of summing. */
    thresholds?: number[];
    /** Multiplier applied to the raw score (WHO-5 reports 0–100). */
    multiplier?: number;
    maxScore: number;
    bands: NonEmptyArray<Band>;
    note?: string;
    /** Locales that currently have validated wording for this instrument. */
    locales: Locale[];
};

/**
 * The scoring half of an instrument: everything that does not change with
 * language. `optionValues` and `bandRanges` are positional — they line up
 * with `InstrumentText.optionText` / `bandLabels` by array index, which is
 * the contract documented in `instruments/types.ts`.
 */
export type ScoringDef = {
    id: string;
    optionValues: number[];
    bandRanges: NonEmptyArray<{ min: number; max: number; tone: Band['tone'] }>;
    reversed?: number[];
    thresholds?: number[];
    multiplier?: number;
    maxScore: number;
};

const seq = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

const SCORING: ScoringDef[] = [
    {
        id: 'asrs', optionValues: seq(5), thresholds: [2, 2, 2, 3, 3, 3], maxScore: 6,
        bandRanges: [{ min: 0, max: 3, tone: 'good' }, { min: 4, max: 6, tone: 'high' }],
    },
    {
        id: 'phq9', optionValues: seq(4), maxScore: 27,
        bandRanges: [
            { min: 0, max: 4, tone: 'good' }, { min: 5, max: 9, tone: 'mild' },
            { min: 10, max: 14, tone: 'moderate' }, { min: 15, max: 19, tone: 'high' }, { min: 20, max: 27, tone: 'high' },
        ],
    },
    {
        id: 'gad7', optionValues: seq(4), maxScore: 21,
        bandRanges: [
            { min: 0, max: 4, tone: 'good' }, { min: 5, max: 9, tone: 'mild' },
            { min: 10, max: 14, tone: 'moderate' }, { min: 15, max: 21, tone: 'high' },
        ],
    },
    {
        id: 'isi', optionValues: seq(5), maxScore: 28,
        bandRanges: [
            { min: 0, max: 7, tone: 'good' }, { min: 8, max: 14, tone: 'mild' },
            { min: 15, max: 21, tone: 'moderate' }, { min: 22, max: 28, tone: 'high' },
        ],
    },
    {
        id: 'pss10', optionValues: seq(5), reversed: [3, 4, 6, 7], maxScore: 40,
        bandRanges: [{ min: 0, max: 13, tone: 'good' }, { min: 14, max: 26, tone: 'moderate' }, { min: 27, max: 40, tone: 'high' }],
    },
    {
        id: 'who5', optionValues: seq(6), multiplier: 4, maxScore: 100,
        bandRanges: [
            { min: 0, max: 28, tone: 'high' }, { min: 29, max: 50, tone: 'moderate' },
            { min: 51, max: 75, tone: 'mild' }, { min: 76, max: 100, tone: 'good' },
        ],
    },
    {
        id: 'asrs18', optionValues: seq(5), maxScore: 72,
        bandRanges: [{ min: 0, max: 16, tone: 'good' }, { min: 17, max: 23, tone: 'moderate' }, { min: 24, max: 72, tone: 'high' }],
    },
    {
        id: 'cesd', optionValues: seq(4), reversed: [3, 7, 11, 15], maxScore: 60,
        bandRanges: [
            { min: 0, max: 15, tone: 'good' }, { min: 16, max: 20, tone: 'mild' },
            { min: 21, max: 30, tone: 'moderate' }, { min: 31, max: 60, tone: 'high' },
        ],
    },
    {
        id: 'cfq', optionValues: seq(5), maxScore: 100,
        bandRanges: [
            { min: 0, max: 30, tone: 'good' }, { min: 31, max: 50, tone: 'mild' },
            { min: 51, max: 70, tone: 'moderate' }, { min: 71, max: 100, tone: 'high' },
        ],
    },
    {
        id: 'phq15', optionValues: seq(3), maxScore: 30,
        bandRanges: [
            { min: 0, max: 4, tone: 'good' }, { min: 5, max: 9, tone: 'mild' },
            { min: 10, max: 14, tone: 'moderate' }, { min: 15, max: 30, tone: 'high' },
        ],
    },
    {
        id: 'rses', optionValues: seq(4), reversed: [1, 4, 5, 7, 8], maxScore: 30,
        bandRanges: [{ min: 0, max: 14, tone: 'high' }, { min: 15, max: 22, tone: 'moderate' }, { min: 23, max: 30, tone: 'good' }],
    },
    {
        id: 'mdq', optionValues: seq(2), maxScore: 13,
        bandRanges: [{ min: 0, max: 6, tone: 'good' }, { min: 7, max: 13, tone: 'high' }],
    },
];

const TEXT_BY_LOCALE: Record<Locale, InstrumentTextBundle> = { ru, en };

function mergeOne(scoring: ScoringDef, text: InstrumentText, locales: Locale[]): ClinicalTest {
    return {
        id: scoring.id,
        name: text.name, short: text.short, intro: text.intro, period: text.period,
        questions: text.questions,
        options: scoring.optionValues.map((val, i) => ({ val, text: text.optionText[i] ?? '' })),
        ...(scoring.reversed !== undefined ? { reversed: scoring.reversed } : {}),
        ...(scoring.thresholds !== undefined ? { thresholds: scoring.thresholds } : {}),
        ...(scoring.multiplier !== undefined ? { multiplier: scoring.multiplier } : {}),
        maxScore: scoring.maxScore,
        bands: scoring.bandRanges.map((b, i) => ({ ...b, label: text.bandLabels[i] ?? '' })) as NonEmptyArray<Band>,
        ...(text.note !== undefined ? { note: text.note } : {}),
        locales,
    };
}

/**
 * The merge behind both `clinicalTests` and `unavailableInstruments`, as a
 * free function of its inputs rather than the module-level scoring table and
 * text bundles — so a test can exercise "an instrument missing from a
 * locale" without needing an actual gap in the real, fully-translated
 * content.
 */
export function mergeInstruments(scoringList: ScoringDef[], byLocale: Record<Locale, InstrumentTextBundle>, locale: Locale) {
    const locales = Object.keys(byLocale) as Locale[];
    const bundle = byLocale[locale];
    const available: ClinicalTest[] = [];
    const unavailable: { id: string; name: string }[] = [];
    for (const scoring of scoringList) {
        const text = bundle[scoring.id];
        if (text) {
            available.push(mergeOne(scoring, text, locales.filter(l => byLocale[l][scoring.id])));
        } else {
            // Best-effort display name from whichever locale does have this
            // instrument, preferring Russian since every instrument here
            // originated there before Phase 11's English translations landed.
            const known = byLocale.ru?.[scoring.id] ?? byLocale.en?.[scoring.id];
            unavailable.push({ id: scoring.id, name: known?.name ?? scoring.id });
        }
    }
    return { available, unavailable };
}

/**
 * Every instrument with validated wording in `locale`, merged with its
 * scoring. An instrument whose wording has not been validated for this
 * locale is simply absent — see `unavailableInstruments` for what to show
 * instead of nothing.
 */
export function clinicalTests(locale: Locale): ClinicalTest[] {
    return mergeInstruments(SCORING, TEXT_BY_LOCALE, locale).available;
}

/**
 * Instruments that exist (have scoring defined) but have no validated
 * wording in `locale` — for a visible "not available in this language yet"
 * notice, rather than a list that is silently shorter with no explanation.
 */
export function unavailableInstruments(locale: Locale): { id: string; name: string }[] {
    return mergeInstruments(SCORING, TEXT_BY_LOCALE, locale).unavailable;
}

export function scoreTest(test: ClinicalTest, answers: (number | null)[]): number {
    const vals = answers.map(a => (a === null ? 0 : a));

    if (test.thresholds) {
        // ASRS counts items crossing their own threshold. An answer with no
        // matching threshold cannot cross one, so it does not count.
        const thresholds = test.thresholds;
        return vals.reduce((n, v, i) => {
            const t = thresholds[i];
            return n + (t !== undefined && v >= t ? 1 : 0);
        }, 0);
    }

    const maxOpt = Math.max(...test.options.map(o => o.val));
    const raw = vals.reduce((sum, v, i) =>
        sum + (test.reversed?.includes(i) ? maxOpt - v : v), 0);

    return raw * (test.multiplier ?? 1);
}

export function bandFor(test: ClinicalTest, score: number): Band {
    return test.bands.find(b => score >= b.min && score <= b.max) ?? lastOf(test.bands);
}

export const TONE_CLASS: Record<Band['tone'], string> = {
    good: 'text-green-400 border-green-400/40 bg-green-400/10',
    mild: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10',
    moderate: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
    high: 'text-red-400 border-red-400/40 bg-red-400/10',
};
