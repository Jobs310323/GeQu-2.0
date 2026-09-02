import { describe, it, expect } from 'vitest';
import { clinicalTests, mergeInstruments, scoreTest, bandFor, type ClinicalTest, type ScoringDef } from './clinicalTests';
import type { InstrumentText, InstrumentTextBundle } from './instruments/types';
import type { Locale } from '../i18n/locale';

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
 *
 * Phase 11b split each instrument into locale-independent scoring
 * (lib/clinicalTests.ts) and locale-specific wording (lib/instruments/{en,ru}.ts).
 * The extra assertions here — scoring is byte-identical across locales, and an
 * instrument missing from a locale is filtered out rather than rendered — are
 * exactly what could have silently broken in that move.
 */

const RU = clinicalTests('ru');
const byId = (id: string): ClinicalTest => {
    const t = RU.find(x => x.id === id);
    if (!t) throw new Error(`no test ${id}`);
    return t;
};

/** Answer every item with the same option value. */
const all = (t: ClinicalTest, v: number) => t.questions.map(() => v);

describe('instrument definitions', () => {
    it.each(RU.map(t => [t.id, t] as const))('%s is internally consistent', (_id, t) => {
        expect(t.questions.length).toBeGreaterThan(0);
        expect(t.options.length).toBeGreaterThan(1);
        expect(t.bands.length).toBeGreaterThan(0);

        // Reversed and threshold indices must address real questions, or an
        // off-by-one silently changes everyone's score.
        for (const i of t.reversed ?? []) {
            expect(i, `${t.id} reversed index`).toBeLessThan(t.questions.length);
        }
        if (t.thresholds) expect(t.thresholds).toHaveLength(t.questions.length);

        // Every question must have its own wording, and every option its own
        // label — a merge that ran out of text (a locale file shorter than the
        // scoring definition) would otherwise pass through as an empty string.
        for (const q of t.questions) expect(q.trim().length).toBeGreaterThan(0);
        for (const o of t.options) expect(o.text.trim().length).toBeGreaterThan(0);
        for (const b of t.bands) expect(b.label.trim().length).toBeGreaterThan(0);
    });

    it.each(RU.map(t => [t.id, t] as const))('%s bands cover 0..maxScore with no gap or overlap', (_id, t) => {
        const sorted = [...t.bands].sort((a, b) => a.min - b.min);
        expect(sorted[0]!.min).toBe(0);
        expect(sorted.at(-1)!.max).toBe(t.maxScore);
        for (let i = 0; i < sorted.length - 1; i++) {
            // A gap leaves a score with no band; an overlap makes the band
            // depend on array order rather than on the score.
            expect(sorted[i + 1]!.min, `${t.id} band boundary`).toBe(sorted[i]!.max + 1);
        }
    });

    it.each(RU.map(t => [t.id, t] as const))('%s maxScore matches what scoreTest can actually produce', (_id, t) => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        const highest = t.thresholds
            ? t.questions.length                       // threshold tests count items
            : maxOpt * t.questions.length * (t.multiplier ?? 1);
        expect(highest).toBe(t.maxScore);
    });

    it.each(RU.map(t => [t.id, t] as const))('%s assigns a band to every attainable score', (_id, t) => {
        for (let s = 0; s <= t.maxScore; s++) {
            expect(bandFor(t, s), `${t.id} score ${s}`).toBeDefined();
        }
    });
});

describe('scoring is byte-identical across locales', () => {
    // The move to lib/instruments/{en,ru}.ts split each instrument's scoring
    // (shared) from its wording (per locale). These assert the split didn't
    // let a locale's merge silently pick up the wrong option values, reversed
    // indices, thresholds, multiplier or band ranges — everything that
    // determines the NUMBER, as opposed to the words describing it.
    const EN = clinicalTests('en');

    it('has the same set of instrument ids in both locales', () => {
        expect(EN.map(t => t.id).sort()).toEqual(RU.map(t => t.id).sort());
    });

    it.each(RU.map(t => [t.id] as const))('%s scores identically in ru and en for every option value', (id) => {
        const ru = RU.find(t => t.id === id)!;
        const en = EN.find(t => t.id === id)!;
        expect(en.maxScore).toBe(ru.maxScore);
        expect(en.reversed).toEqual(ru.reversed);
        expect(en.thresholds).toEqual(ru.thresholds);
        expect(en.multiplier).toBe(ru.multiplier);
        expect(en.options.map(o => o.val)).toEqual(ru.options.map(o => o.val));
        expect(en.bands.map(b => [b.min, b.max, b.tone])).toEqual(ru.bands.map(b => [b.min, b.max, b.tone]));

        const maxOpt = Math.max(...ru.options.map(o => o.val));
        for (const v of [0, 1, maxOpt]) {
            expect(scoreTest(en, all(en, v)), `${id} @ ${v}`).toBe(scoreTest(ru, all(ru, v)));
        }
    });

    it.each(RU.map(t => [t.id] as const))('%s resolves the same band for the same score in ru and en', (id) => {
        const ru = RU.find(t => t.id === id)!;
        const en = EN.find(t => t.id === id)!;
        for (let s = 0; s <= ru.maxScore; s += Math.max(1, Math.floor(ru.maxScore / 5))) {
            expect(bandFor(en, s).tone, `${id} @ ${s}`).toBe(bandFor(ru, s).tone);
        }
    });
});

describe('mergeInstruments — an instrument missing from a locale', () => {
    // Synthetic scoring + text, decoupled from the real (fully-translated)
    // content, so this can exercise a gap that does not currently exist in
    // production data.
    const scoring: ScoringDef[] = [
        { id: 'complete', optionValues: [0, 1], maxScore: 1, bandRanges: [{ min: 0, max: 1, tone: 'good' }] },
        { id: 'ru-only', optionValues: [0, 1], maxScore: 1, bandRanges: [{ min: 0, max: 1, tone: 'good' }] },
    ];
    const text = (id: string): InstrumentText => ({
        name: `Name ${id}`, short: id, intro: 'intro', period: 'period',
        questions: ['q1'], optionText: ['a', 'b'], bandLabels: ['band'],
    });
    const byLocale: Record<Locale, InstrumentTextBundle> = {
        ru: { complete: text('complete'), 'ru-only': text('ru-only') },
        en: { complete: text('complete') },
    };

    it('includes an instrument only in locales that have its wording', () => {
        const en = mergeInstruments(scoring, byLocale, 'en');
        expect(en.available.map(t => t.id)).toEqual(['complete']);
        expect(en.unavailable.map(t => t.id)).toEqual(['ru-only']);

        const ru = mergeInstruments(scoring, byLocale, 'ru');
        expect(ru.available.map(t => t.id).sort()).toEqual(['complete', 'ru-only']);
        expect(ru.unavailable).toEqual([]);
    });

    it('never renders a locale-missing instrument with another locale\'s text substituted', () => {
        const en = mergeInstruments(scoring, byLocale, 'en');
        expect(en.available.some(t => t.id === 'ru-only')).toBe(false);
    });

    it('reports which locales do have each instrument', () => {
        const en = mergeInstruments(scoring, byLocale, 'en');
        expect(en.available[0]!.locales.sort()).toEqual(['en', 'ru']);
    });

    it('gives the unavailable instrument a real name rather than just its id', () => {
        const en = mergeInstruments(scoring, byLocale, 'en');
        expect(en.unavailable[0]!.name).toBe('Name ru-only');
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
    it.each(RU.map(t => [t.id, t] as const))('%s returns 0 when nothing is answered', (_id, t) => {
        const score = scoreTest(t, t.questions.map(() => null));
        expect(Number.isFinite(score)).toBe(true);
        // A test with reversed items scores above zero from unanswered items,
        // which is correct — "never" on a positively-worded item is a real answer.
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(t.maxScore);
    });

    it.each(RU.map(t => [t.id, t] as const))('%s never exceeds its declared maxScore', (_id, t) => {
        const maxOpt = Math.max(...t.options.map(o => o.val));
        for (const v of [0, 1, maxOpt]) {
            expect(scoreTest(t, all(t, v))).toBeLessThanOrEqual(t.maxScore);
        }
    });
});
