import { describe, it, expect } from 'vitest';
import {
    allInsights, baselineInsight, associationInsight, blockerInsight, coverageInsight,
} from './engine';
import { renderable, confidenceFrom, MIN_SAMPLE, MIN_EFFECT } from './types';
import { baselineFor, median, mad, trendOf, effectSize, MIN_BASELINE_SAMPLE } from './baseline';
import type { DayLog } from '../../types/domain';
import { addDays, todayKey, parseDateKey } from '../../lib/datetime';
import { i18next } from '../../i18n';
import { SUPPORTED_LOCALES } from '../../i18n/locale';
import { renderInsight, type Insight } from './types';

/**
 * What these tests defend is mostly SILENCE.
 *
 * The engine's job is to say the few things a person's own data supports, and
 * to say nothing the rest of the time. Almost every test below asserts that
 * something is *not* reported: too few days, too small a difference, one side
 * of a comparison too thin. That is the hard part — producing a sentence is
 * easy, and a plausible-sounding one from four days is worse than an empty
 * screen, because the user will act on it.
 *
 * The second thing defended is the causal boundary. A person's data can show
 * that two things moved together. Nothing here may imply one produced the other.
 * Since Phase 11 that is checked against the RENDERED sentence in every locale,
 * not against the detector's key: the boundary belongs to what the user reads,
 * and a translation is exactly where a stray "improves" would slip back in.
 */

/** The sentence a user in `locale` actually sees for this insight. */
const say = (insight: Insight, locale: string): string =>
    renderInsight(insight, i18next.getFixedT(locale));

const log = (over: Partial<DayLog> & { date: string }): DayLog => ({
    date: over.date, sleep: over.sleep ?? 6, focus: over.focus ?? 5, mood: over.mood ?? 5,
    helped: over.helped ?? [], hindered: over.hindered ?? [], mainEvent: '', id: 0,
} as DayLog);

/** n consecutive days ending today, oldest first. */
const days = (n: number, shape: (i: number) => Partial<DayLog>): DayLog[] =>
    Array.from({ length: n }, (_, i) =>
        log({ date: parseDateKey(addDays(todayKey(), -(n - 1 - i))).toISOString(), ...shape(i) }));

describe('robust statistics', () => {
    it('median ignores a single extreme day', () => {
        // The reason mean is not used: one terrible night should not redefine
        // someone's normal.
        expect(median([6, 6, 6, 6, 6, 0])).toBe(6);
    });

    it('mad measures ordinary day-to-day variation', () => {
        expect(mad([5, 5, 5, 5])).toBe(0);
        expect(mad([4, 5, 6, 7])).toBeGreaterThan(0);
    });

    it('median handles an empty list without producing NaN', () => {
        expect(median([])).toBe(0);
        expect(mad([])).toBe(0);
    });
});

describe('baselineFor', () => {
    it('is null below the minimum history', () => {
        // Four days is not a baseline, and presenting one would give every
        // later comparison a false anchor.
        expect(baselineFor(Array(MIN_BASELINE_SAMPLE - 1).fill(6))).toBeNull();
    });

    it('describes typical, recent and spread once there is enough', () => {
        const b = baselineFor(Array(14).fill(6))!;
        expect(b.typical).toBe(6);
        expect(b.recent).toBe(6);
        expect(b.spread).toBe(0);
        expect(b.sampleSize).toBe(14);
    });

    it('calls a change steady unless it exceeds one normal day of variation', () => {
        expect(trendOf(6, 6.2, 1)).toBe('steady');
        expect(trendOf(6, 7.5, 1)).toBe('rising');
        expect(trendOf(6, 4.5, 1)).toBe('falling');
    });

    it('calls everything steady for someone with no variation', () => {
        // No scale on which to call anything a change. Reporting a trend here
        // would be dividing by zero and dressing the result as a finding.
        expect(trendOf(6, 9, 0)).toBe('steady');
        expect(effectSize(3, 0)).toBeNull();
    });
});

describe('suppression — the main job', () => {
    it('says nothing at all with no data', () => {
        expect(allInsights([])).toEqual([]);
    });

    it('says nothing with fewer than the minimum days', () => {
        expect(allInsights(days(MIN_SAMPLE - 1, () => ({})))).toEqual([]);
    });

    it('suppresses a baseline below the baseline minimum', () => {
        expect(baselineInsight(days(MIN_BASELINE_SAMPLE - 1, () => ({ focus: 7 })), 'focus')).toBeNull();
    });

    it('suppresses an association when one side is too thin', () => {
        // Twenty days, but only two of them slept badly. Two days cannot
        // characterise "days you slept badly".
        const logs = [
            ...days(18, () => ({ sleep: 8, focus: 8 })),
            ...days(2, () => ({ sleep: 2, focus: 2 })),
        ];
        expect(associationInsight(logs, 'sleep', 'focus')).toBeNull();
    });

    it('suppresses a difference smaller than the user’s own variation', () => {
        // A real but tiny gap. Someone whose focus swings by 2 points daily
        // should not be told about a 0.2-point difference.
        const logs = days(30, i => ({
            sleep: i % 2 === 0 ? 8 : 4,
            focus: (i % 2 === 0 ? 5.1 : 5) + (i % 5),   // large natural spread
        }));
        const insight = associationInsight(logs, 'sleep', 'focus');
        expect(insight === null || insight.effectSize! < MIN_EFFECT).toBe(true);
    });

    it('renderable is the last gate and catches a detector that forgot', () => {
        expect(renderable({
            id: 'x', claim: 'observed', messageKey: 'insights:coverage', params: {},
            sampleSize: MIN_SAMPLE - 1, windowDays: 30, confidence: 'none',
        })).toBe(false);

        expect(renderable({
            id: 'x', claim: 'associated', messageKey: 'insights:association', params: {},
            sampleSize: 40, windowDays: 30, effectSize: 0.2, confidence: 'moderate',
        })).toBe(false);

        expect(renderable({
            id: 'x', claim: 'observed', messageKey: '   ', params: {},
            sampleSize: 40, windowDays: 30, confidence: 'moderate',
        })).toBe(false);
    });
});

describe('what it does report', () => {
    it('reports a baseline once there is enough history', () => {
        const insight = baselineInsight(days(20, () => ({ focus: 6 })), 'focus')!;
        expect(insight.claim).toBe('observed');
        expect(insight.baseline!.typical).toBe(6);
        expect(insight.sampleSize).toBe(20);
    });

    it('reports a large, real association', () => {
        const logs = [
            ...days(10, () => ({ sleep: 9, focus: 9 })),
            ...days(10, () => ({ sleep: 2, focus: 3 })),
        ];
        const insight = associationInsight(logs, 'sleep', 'focus')!;
        expect(insight.claim).toBe('associated');
        expect(insight.effectSize).toBeGreaterThanOrEqual(MIN_EFFECT);
    });

    it('follows the data even when the direction is surprising', () => {
        // Less sleep, better focus. The engine must not assume the story.
        const logs = [
            ...days(10, () => ({ sleep: 9, focus: 3 })),
            ...days(10, () => ({ sleep: 2, focus: 8 })),
        ];
        const insight = associationInsight(logs, 'sleep', 'focus')!;
        expect(say(insight, 'ru')).toContain('ниже');
        expect(say(insight, 'en')).toContain('lower');
    });

    it('reports coverage, so the user can judge everything else', () => {
        const insight = coverageInsight(days(12, () => ({})))!;
        expect(insight.claim).toBe('observed');
        expect(insight.params['ratedDays']).toBe(12);
        for (const locale of SUPPORTED_LOCALES) expect(say(insight, locale)).toContain('12');
    });

    it('reports the most frequent blocker once it clears the minimum', () => {
        const logs = days(20, i => ({ hindered: i < 12 ? ['шум'] : ['другое'] }));
        const insight = blockerInsight(logs)!;
        expect(insight.params['tag']).toBe('шум');
        // A user's own tag is their words and is never translated.
        for (const locale of SUPPORTED_LOCALES) expect(say(insight, locale)).toContain('шум');
    });
});

describe('the causal boundary', () => {
    const logs = [
        ...days(10, () => ({ sleep: 9, focus: 9, mood: 8, hindered: ['шум'] })),
        ...days(10, () => ({ sleep: 2, focus: 3, mood: 3, hindered: ['шум'] })),
    ];

    it('never uses a causal verb in any insight, in any locale', () => {
        // The single most important assertion in this file. A person reading
        // "sleep improves your focus" may change their medication.
        // Conjugated verbs and causal connectives only. The bare noun "cause"
        // is deliberately absent: the association sentence ENDS with "not a
        // proven cause", and a regex that flagged its own disclaimer would push
        // the next author to delete the disclaimer to get green.
        const causal: Record<string, RegExp> = {
            ru: /улучшает|ухудшает|повышает|снижает|вызыва|приводит|из-за|потому что|влия|помогает тебе/i,
            en: /\b(improves?|worsens?|increases?|reduces?|causes|caused|causing|leads? to|because|due to|affects?|helps you)\b/i,
        };
        for (const insight of allInsights(logs)) {
            for (const locale of SUPPORTED_LOCALES) {
                expect(say(insight, locale), `${insight.id} (${locale})`).not.toMatch(causal[locale]!);
            }
        }
    });

    it('marks a co-occurrence as an association, not an observation', () => {
        expect(associationInsight(logs, 'sleep', 'focus')!.claim).toBe('associated');
    });

    it('says out loud that an association is not a cause', () => {
        const insight = associationInsight(logs, 'sleep', 'focus')!;
        expect(say(insight, 'ru')).toMatch(/не доказанная причина|совпадение/i);
        expect(say(insight, 'en')).toMatch(/not a proven cause|co-occurrence/i);
    });

    it('never emits an inferred or uncertain claim from the local engine', () => {
        // Only the AI layer may go beyond the data, and it has to label it.
        for (const insight of allInsights(logs)) {
            expect(['observed', 'associated']).toContain(insight.claim);
        }
    });
});

describe('every insight can account for itself', () => {
    const logs = [
        ...days(15, () => ({ sleep: 9, focus: 9, hindered: ['шум'] })),
        ...days(15, () => ({ sleep: 2, focus: 3, hindered: ['шум'] })),
    ];

    it('states a sample size and a window', () => {
        const insights = allInsights(logs);
        expect(insights.length).toBeGreaterThan(0);
        for (const i of insights) {
            expect(i.sampleSize, i.id).toBeGreaterThanOrEqual(MIN_SAMPLE);
            expect(i.windowDays, i.id).toBeGreaterThan(0);
        }
    });

    it('resolves to a real sentence in every locale', () => {
        // A missing translation makes i18next echo the key, which would put
        // `insights:baseline.trend` on the user's screen rather than a sentence.
        for (const insight of allInsights(logs)) {
            for (const locale of SUPPORTED_LOCALES) {
                const sentence = say(insight, locale);
                expect(sentence, `${insight.id} (${locale})`).not.toBe(insight.messageKey);
                expect(sentence, `${insight.id} (${locale})`).not.toMatch(/\{\{|\$t\(/);
            }
        }
    });

    it('never claims more than moderate confidence', () => {
        // Self-reported data from an uncontrolled setting. Nothing earns more,
        // however many days there are.
        const many = days(365, () => ({ sleep: 7, focus: 7 }));
        for (const i of allInsights(many, 365)) expect(i.confidence).not.toBe('high');
        expect(confidenceFrom(100_000)).toBe('moderate');
    });

    it('reports no confidence below the minimum sample', () => {
        expect(confidenceFrom(MIN_SAMPLE - 1)).toBe('none');
    });

    it('only looks inside the window', () => {
        const old = Array.from({ length: 40 }, (_, i) =>
            log({ date: parseDateKey(addDays(todayKey(), -90 - i)).toISOString(), sleep: 9, focus: 9 }));
        expect(allInsights(old, 30)).toEqual([]);
    });
});
