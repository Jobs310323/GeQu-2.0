import { describe, it, expect, vi, afterEach } from 'vitest';
import { i18next } from '../../i18n';
import { SUPPORTED_LOCALES } from '../../i18n/locale';
import {
    normalize, personalPercentile, confidenceFor, scoreAttempt, historyFor,
    MIN_ATTEMPTS_FOR_PERCENTILE, MIN_ATTEMPTS_FOR_CONFIDENCE, ATTEMPTS_FOR_MODERATE_CONFIDENCE,
} from './scoring';
import { ENGINES, engineFor, assessments, drills } from './registry';
import type { TestResult } from '../../types/domain';

/**
 * These numbers get shown to a person as a statement about their own mind, so
 * the arithmetic is pinned by hand and the *restraint* is pinned harder.
 *
 * The failure mode this guards against is not a wrong percentile. It is a
 * percentile that should not have been shown at all — a confident-looking
 * number computed from three attempts, which a user then reads as evidence
 * about their attention or memory. `undefined` is the correct output far more
 * often than any number is.
 */

afterEach(() => vi.restoreAllMocks());

const schulte = engineFor('schulte')!;    // lower is better, [15, 90]
const digitspan = engineFor('digitspan')!; // higher is better, [3, 12]

describe('registry', () => {
    it.each(ENGINES.map(e => [e.id, e] as const))('%s is coherent', (_id, e) => {
        expect(e.version).toMatch(/^\d+\.\d+\.\d+$/);
        const [lo, hi] = e.plausibleRange;
        expect(hi).toBeGreaterThan(lo);
        expect(e.limitationKeys.length).toBeGreaterThan(0);
        // A caveat vague enough to apply to anything teaches users to skip the
        // ones that matter, so the length check moved to the rendered sentence
        // rather than the key — and now runs for both locales.
        for (const locale of SUPPORTED_LOCALES) {
            const tr = i18next.getFixedT(locale);
            for (const key of e.limitationKeys) {
                const sentence = tr(key) as unknown as string;
                expect(sentence, `${key} (${locale})`).not.toBe(key);
                expect(sentence.length, `${key} (${locale})`).toBeGreaterThan(30);
            }
        }
    });

    it('splits into assessments and drills with nothing left over', () => {
        expect(assessments().length + drills().length).toBe(ENGINES.length);
    });

    it('has no duplicate ids', () => {
        expect(new Set(ENGINES.map(e => e.id)).size).toBe(ENGINES.length);
    });
});

describe('normalize', () => {
    it('inverts direction so higher is always better', () => {
        // Schulte: 15s is the best end of [15, 90], so it must score 100.
        expect(normalize(schulte, 15, [])).toBe(100);
        expect(normalize(schulte, 90, [])).toBe(0);
        // Digit span: 12 is the best end of [3, 12].
        expect(normalize(digitspan, 12, [])).toBe(100);
        expect(normalize(digitspan, 3, [])).toBe(0);
    });

    it('places a midpoint at 50', () => {
        // (15 + 90) / 2 = 52.5
        expect(normalize(schulte, 52.5, [])).toBe(50);
    });

    it('clamps a score outside the plausible range', () => {
        expect(normalize(schulte, 5, [])).toBe(100);
        expect(normalize(schulte, 500, [])).toBe(0);
    });

    it('switches to the personal range once enough attempts exist', () => {
        // Someone whose Schulte times all sit between 30 and 40 should see the
        // full 0–100 spread across THEIR range, not be squashed into the middle
        // of a generic one. 30 against [30..40] is the best → 100.
        const history = [30, 34, 40];
        expect(history.length).toBeGreaterThanOrEqual(MIN_ATTEMPTS_FOR_CONFIDENCE);
        expect(normalize(schulte, 30, history)).toBe(100);
        expect(normalize(schulte, 40, history)).toBe(0);
        // The same 30 against the generic range is merely good, not perfect.
        expect(normalize(schulte, 30, [])).toBeLessThan(100);
    });

    it('returns mid-scale when every attempt is identical', () => {
        // No spread to place the value in. 50 is the honest answer; 0 or 100
        // would assert a ranking the data cannot support.
        expect(normalize(schulte, 35, [35, 35, 35])).toBe(50);
    });

    it('returns 0 for a non-finite score rather than NaN', () => {
        expect(normalize(schulte, Number.NaN, [])).toBe(0);
        expect(normalize(schulte, Number.POSITIVE_INFINITY, [])).toBe(0);
    });
});

describe('personalPercentile', () => {
    it('is withheld below the minimum sample', () => {
        // The restraint that matters most. Four attempts cannot place a fifth.
        const history = Array.from({ length: MIN_ATTEMPTS_FOR_PERCENTILE - 1 }, (_, i) => 30 + i);
        expect(personalPercentile(schulte, 25, history)).toBeUndefined();
    });

    it('is reported once the sample is large enough', () => {
        const history = [40, 38, 36, 34, 32];
        expect(personalPercentile(schulte, 30, history)).toBe(100);
    });

    it('counts how many previous attempts this one beat, respecting direction', () => {
        // Schulte, lower is better. 35 beats 40, 38 and 36 — three of five.
        expect(personalPercentile(schulte, 35, [40, 38, 36, 34, 32])).toBe(60);
        // Digit span, higher is better. 7 beats 3, 4, 5, 6 — four of five.
        expect(personalPercentile(digitspan, 7, [3, 4, 5, 6, 8])).toBe(80);
    });

    it('gives 0 for a worst-ever attempt', () => {
        expect(personalPercentile(schulte, 99, [40, 38, 36, 34, 32])).toBe(0);
    });
});

describe('confidenceFor', () => {
    it('claims nothing for a first attempt', () => {
        expect(confidenceFor(0)).toBe('none');
        expect(confidenceFor(MIN_ATTEMPTS_FOR_CONFIDENCE - 1)).toBe('none');
    });

    it('rises with the sample', () => {
        expect(confidenceFor(MIN_ATTEMPTS_FOR_CONFIDENCE)).toBe('low');
        expect(confidenceFor(ATTEMPTS_FOR_MODERATE_CONFIDENCE)).toBe('moderate');
    });

    it('never claims more than moderate, however much history exists', () => {
        // The conditions are uncontrolled and the instruments are not validated.
        // No amount of repetition makes them so.
        expect(confidenceFor(10_000)).toBe('moderate');
    });
});

describe('scoreAttempt', () => {
    it('always reports self as the reference population', () => {
        // There is no normative sample and there will not be one. If this ever
        // becomes anything else, a user is being told they rank against people.
        const s = scoreAttempt(schulte, 35, [40, 38, 36, 34, 32]);
        expect(s.referencePopulation).toBe('self');
    });

    it('carries the engine version, so a later change cannot fake a trend', () => {
        expect(scoreAttempt(schulte, 35, []).testVersion).toBe(schulte.version);
    });

    it('omits the percentile entirely rather than sending a placeholder', () => {
        const s = scoreAttempt(schulte, 35, [40, 38]);
        expect(s.percentile).toBeUndefined();
        expect('percentile' in s).toBe(false);
    });

    it('attaches the exercise limitations to every result', () => {
        expect(scoreAttempt(schulte, 35, []).limitations).toEqual(schulte.limitationKeys);
    });

    it('records the pointer type, which materially changes reaction scores', () => {
        vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('coarse') }));
        expect(scoreAttempt(schulte, 35, []).deviceContext.pointer).toBe('touch');
        vi.unstubAllGlobals();
    });

    it('degrades to unknown rather than throwing where matchMedia is absent', () => {
        vi.stubGlobal('matchMedia', undefined);
        const s = scoreAttempt(schulte, 35, []);
        expect(s.deviceContext.pointer).toBe('unknown');
        expect(s.deviceContext.reducedMotion).toBe(false);
        vi.unstubAllGlobals();
    });
});

describe('historyFor', () => {
    const result = (over: Partial<TestResult>): TestResult => ({
        id: 1, date: '2026-08-01T00:00:00Z', type: 'schulte', value: 35, ...over,
    });

    it('takes only the matching exercise', () => {
        expect(historyFor(schulte, [
            result({ value: 35 }),
            result({ type: 'reaction', value: 250 }),
        ])).toEqual([35]);
    });

    it('includes records written before the envelope existed', () => {
        // Pre-Phase-9 results have no testVersion. They were produced by 1.0.0
        // by definition, and excluding them would throw away the user's history.
        expect(historyFor(schulte, [result({ value: 41 })])).toEqual([41]);
    });

    it('excludes attempts from a different version of the task', () => {
        // Mixing them would turn a rule change into an apparent trend.
        expect(historyFor(schulte, [
            result({ value: 35, testVersion: '1.0.0' }),
            result({ value: 90, testVersion: '2.0.0' }),
        ])).toEqual([35]);
    });

    it('drops non-numeric values instead of poisoning the statistics', () => {
        expect(historyFor(schulte, [
            result({ value: 35 }),
            result({ value: Number.NaN }),
        ])).toEqual([35]);
    });
});
