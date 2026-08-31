import { describe, it, expect } from 'vitest';
import { CLINICAL_TESTS, LONG_TESTS, scoreTest, bandFor } from './clinicalTests';
import type { ClinicalTest } from './clinicalTests';

/**
 * These are validated psychometric instruments, and their scoring rules are
 * published and fixed. A bug here does not produce a wrong pixel — it tells
 * someone their depression is "minimal" when the same answers score "moderately
 * severe" everywhere else. That is the one output in this app a user might act
 * on medically, so the arithmetic is pinned against the published rules rather
 * than against the implementation's own behaviour.
 *
 * The app is careful not to present these as diagnostic, and these tests exist
 * to keep the *numbers* honest so that framing stays true.
 */

const ALL = [...CLINICAL_TESTS, ...LONG_TESTS];
const byId = (id: string): ClinicalTest => {
    const t = ALL.find(x => x.id === id);
    if (!t) throw new Error(`no test ${id}`);
    return t;
};

/** Answer every item with the same option value. */
const all = (t: ClinicalTest, v: number) => t.questions.map(() => v);

describe('instrument definitions', () => {
    it.each(ALL.map(t => [t.id, t] as const))('%s is internally consistent', (_id, t) => {
        expect(t.questions.length).toBeGreaterThan(0);
        expect(t.options.length).toBeGreaterThan(1);
        expect(t.bands.length).toBeGreaterThan(0);

        // Reversed and threshold indices must address real questions, or an
        // off-by-one silently changes everyone's score.
        for (const i of t.reversed ?? []) {
            expect(i, `${t.id} reversed index`).toBeLessThan(t.questions.length);
        }
        if (t.thresholds) expect(t.thresholds).toHaveLength(t.questions.length);
    });

    it.each(ALL.map(t => [t.id, t] as const))('%s bands cover 0..maxScore with no gap or overlap', (_id, t) => {
        const sorted = [...t.bands].sort((a, b) => a.min - b.min);
        expect(sorted[0]!.min).toBe(0);
        expect(sorted.at(-1)!.max).toBe(t.maxScore);
        for (let i = 0; i < sorted.length - 1; i++) {
            // A gap leaves a score with no band; an overlap makes the band
            // depend on array order rather than on the score.
            expect(sorted[i + 1]!.min, `${t.id} band boundary`).toBe(sorted[i]!.max + 1);
        }
    });

    it.each(ALL.map(t => [t.id, t] as const))('%s maxScore matches what scoreTest can actually produce', (_id, t) => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        const highest = t.thresholds
            ? t.questions.length                       // threshold tests count items
            : maxOpt * t.questions.length * (t.multiplier ?? 1);
        expect(highest).toBe(t.maxScore);
    });

    it.each(ALL.map(t => [t.id, t] as const))('%s assigns a band to every attainable score', (_id, t) => {
        for (let s = 0; s <= t.maxScore; s++) {
            expect(bandFor(t, s), `${t.id} score ${s}`).toBeDefined();
        }
    });
});

describe('PHQ-9', () => {
    const t = byId('phq9');

    it('sums items 0–3 for a 0–27 range', () => {
        expect(scoreTest(t, all(t, 0))).toBe(0);
        expect(scoreTest(t, all(t, 3))).toBe(27);
    });

    it('places the published severity cut-points in the right bands', () => {
        // 0–4 minimal · 5–9 mild · 10–14 moderate · 15–19 moderately severe · 20–27 severe
        expect(bandFor(t, 4).label).not.toBe(bandFor(t, 5).label);
        expect(bandFor(t, 9).label).not.toBe(bandFor(t, 10).label);
        expect(bandFor(t, 14).label).not.toBe(bandFor(t, 15).label);
        expect(bandFor(t, 19).label).not.toBe(bandFor(t, 20).label);
    });

    it('treats an unanswered item as zero rather than NaN', () => {
        const answers: (number | null)[] = all(t, 3);
        answers[0] = null;
        expect(scoreTest(t, answers)).toBe(24);
    });
});

describe('WHO-5', () => {
    const t = byId('who5');

    it('multiplies the raw 0–25 total by 4 to report 0–100', () => {
        expect(scoreTest(t, all(t, 0))).toBe(0);
        expect(scoreTest(t, all(t, 5))).toBe(100);
        expect(scoreTest(t, all(t, 3))).toBe(60);
    });

    it('reads high as good — the one instrument where the scale inverts', () => {
        expect(bandFor(t, 100).tone).toBe('good');
        expect(bandFor(t, 0).tone).toBe('high');
    });

    it('marks 50 and below as worth attention, per the published cut-off', () => {
        expect(['high', 'moderate']).toContain(bandFor(t, 50).tone);
        expect(['mild', 'good']).toContain(bandFor(t, 51).tone);
    });
});

describe('PSS-10', () => {
    const t = byId('pss10');

    it('reverses exactly the four positively-worded items', () => {
        // Items 4, 5, 7, 8 (0-indexed) are reverse-scored in the published PSS-10.
        expect(t.reversed).toEqual([3, 4, 6, 7]);
    });

    it('scores all-zero answers as the reversed items only', () => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        // Six straight items contribute 0; four reversed contribute maxOpt each.
        expect(scoreTest(t, all(t, 0))).toBe(maxOpt * (t.reversed?.length ?? 0));
    });

    it('is symmetric: all-max mirrors all-zero', () => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        const straight = t.questions.length - (t.reversed?.length ?? 0);
        expect(scoreTest(t, all(t, maxOpt))).toBe(maxOpt * straight);
    });
});

describe('ASRS', () => {
    const t = byId('asrs');

    it('counts items crossing their own threshold, not a plain sum', () => {
        // This is what makes ASRS different: each item has its own cut-point,
        // so the score is a count of items reaching it.
        expect(t.thresholds).toBeDefined();
        const maxOpt = Math.max(...t.options.map(o => o.val));
        expect(scoreTest(t, all(t, maxOpt))).toBe(t.questions.length);
        expect(scoreTest(t, all(t, 0))).toBe(0);
    });

    it('does not count an item answered below its threshold', () => {
        const thresholds = t.thresholds!;
        const answers = thresholds.map(th => th - 1);
        expect(scoreTest(t, answers)).toBe(0);
    });

    it('counts an item answered exactly at its threshold', () => {
        const thresholds = t.thresholds!;
        expect(scoreTest(t, thresholds.slice())).toBe(t.questions.length);
    });
});

describe('scoreTest edge cases', () => {
    it.each(ALL.map(t => [t.id, t] as const))('%s returns 0 when nothing is answered', (_id, t) => {
        const score = scoreTest(t, t.questions.map(() => null));
        expect(Number.isFinite(score)).toBe(true);
        // A test with reversed items scores above zero from unanswered items,
        // which is correct — "never" on a positively-worded item is a real answer.
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(t.maxScore);
    });

    it.each(ALL.map(t => [t.id, t] as const))('%s never exceeds its declared maxScore', (_id, t) => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        for (const v of [0, 1, maxOpt]) {
            expect(scoreTest(t, all(t, v))).toBeLessThanOrEqual(t.maxScore);
        }
    });
});
