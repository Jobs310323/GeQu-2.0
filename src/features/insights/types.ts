import type { TFunction } from 'i18next';
import type { Baseline } from './baseline';

// What an insight is allowed to claim.
//
// Every sentence this app shows about a user's own data falls into one of four
// kinds, and the kind is stored on the record rather than left to the phrasing.
// A reader can then tell "you slept 7 hours on average" from "these two things
// moved together" from "this might mean", without having to parse hedging
// language — and, more importantly, the engine cannot accidentally promote one
// to another by rewording it.

export type ClaimType =
    /** A fact read straight off the data. "You logged 14 days this month." */
    | 'observed'
    /** Two things moved together. Says nothing about why. */
    | 'associated'
    /** A reading that goes beyond the data. Must be marked as such. */
    | 'inferred'
    /** Something the data hints at but cannot support. Shown as a question. */
    | 'uncertain';

/**
 * Translation keys for the label shown next to a claim, so the distinction is
 * visible in whatever language the user reads.
 */
export const CLAIM_LABEL_KEY: Record<ClaimType, string> = {
    observed: 'insights:claim.observed',
    associated: 'insights:claim.associated',
    inferred: 'insights:claim.inferred',
    uncertain: 'insights:claim.uncertain',
};

/** Values interpolated into an insight's sentence. */
export type InsightParams = Record<string, string | number>;

/**
 * One thing the app is prepared to say, with everything needed to judge it.
 *
 * The fields are not decoration. An insight that cannot state its sample size
 * and the window it drew on is not shippable, and `renderable()` enforces that
 * rather than trusting each detector to remember.
 */
export interface Insight {
    id: string;
    claim: ClaimType;
    /**
     * Translation key for the sentence, phrased to match `claim`, plus the
     * values it interpolates.
     *
     * A key and its parameters rather than a finished string: a detector that
     * returned prose could only be tested by matching the prose, and could only
     * ever speak one language. This way the assertion is on what was measured.
     */
    messageKey: string;
    /**
     * Literal values: numbers, and the user's own words. Never translated and
     * never re-interpolated.
     */
    params: InsightParams;
    /**
     * Values that are themselves translation keys — a metric name, a direction
     * — resolved by `renderInsight` before interpolation.
     *
     * Kept apart from `params` rather than written inline as i18next's `$t()`
     * nesting, because nesting inside an interpolated value only expands with
     * `interpolation.skipOnVariables: false`, and that switch would apply to
     * `params` too. `params` carries the user's own tag text, so a tag named
     * `$t(...)` or `{{...}}` would then be evaluated against the translation
     * table. Two fields cost a line; the alternative is an injection point.
     */
    paramKeys?: Record<string, string>;
    /** How many data points stand behind it. Always shown to the user. */
    sampleSize: number;
    /** How far back it looked. */
    windowDays: number;
    /**
     * Size of the difference in the user's own units of variation, where the
     * insight is a comparison. 1.0 is "a normal day's worth".
     */
    effectSize?: number;
    /** Derived from sample size, never asserted. */
    confidence: 'none' | 'low' | 'moderate';
    /** The personal baseline the claim is measured against, where there is one. */
    baseline?: Baseline;
}

/** Below this many data points, nothing is reported at all. */
export const MIN_SAMPLE = 5;

/**
 * A difference must be at least this many of the user's own MADs to be worth a
 * sentence. Below it the two groups are the same person having ordinary days.
 */
export const MIN_EFFECT = 1;

/**
 * Whether an insight may be shown.
 *
 * The last gate before the user sees anything, and deliberately paranoid: a
 * detector that forgets to check its sample size, or that produces a comparison
 * whose effect turns out to be noise, is caught here rather than shipping a
 * confident-sounding sentence drawn from four days.
 */
export function renderable(insight: Insight): boolean {
    if (insight.sampleSize < MIN_SAMPLE) return false;
    if (insight.windowDays <= 0) return false;
    if (!insight.messageKey.trim()) return false;
    // A comparison that knows its effect must clear the floor. One that does
    // not report an effect is not a comparison — an `observed` count, say.
    if (insight.effectSize !== undefined && insight.effectSize < MIN_EFFECT) return false;
    return true;
}

/** How much weight an insight deserves, from how much data stands behind it. */
export function confidenceFrom(sampleSize: number): Insight['confidence'] {
    if (sampleSize < MIN_SAMPLE) return 'none';
    if (sampleSize < 14) return 'low';
    // `moderate` is the ceiling. This is self-reported data from an
    // uncontrolled setting; nothing here earns more.
    return 'moderate';
}

/**
 * The sentence a user reads, in their language.
 *
 * The single place `messageKey`, `params` and `paramKeys` are combined — so the
 * component and the tests cannot disagree about how an insight renders.
 */
export function renderInsight(insight: Insight, t: TFunction): string {
    const resolved: InsightParams = { ...insight.params };
    for (const [name, key] of Object.entries(insight.paramKeys ?? {})) resolved[name] = t(key);
    // `as string`: with no key typing in place yet, i18next's overloads widen
    // the return to include its detailed-result object. Every key here resolves
    // to a plain string, and `engine.test.ts` asserts that in both locales.
    return t(insight.messageKey, resolved as never) as unknown as string;
}
