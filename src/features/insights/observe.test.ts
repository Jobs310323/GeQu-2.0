import { describe, it, expect, vi, afterEach } from 'vitest';
import { MIN_SAMPLE, sleepFocusObservation, frequentBlockerObservation, todaysObservation } from './observe';
import type { DayLog } from '../../types/domain';
import { addDays, todayKey, parseDateKey } from '../../lib/datetime';

/**
 * The product rule these tests defend: below the minimum sample an observation
 * is SUPPRESSED, not hedged, and the language states association, never cause.
 *
 * That is not a stylistic preference. This app shows people conclusions about
 * their own sleep, focus and mood, and a confident-sounding claim drawn from
 * four days is a claim they might act on. "Not enough data yet" is a real
 * answer; a weak finding wrapped in qualifiers is not.
 */

afterEach(() => vi.useRealTimers());

function log(over: Partial<DayLog> & { date: string }): DayLog {
    return {
        date: over.date,
        sleep: over.sleep ?? 6,
        focus: over.focus ?? 5,
        mood: over.mood ?? 5,
        helped: over.helped ?? [],
        hindered: over.hindered ?? [],
        mainEvent: over.mainEvent ?? '',
    } as DayLog;
}

/** n days ending today, alternating the given shapes. */
function days(n: number, shape: (i: number) => Partial<DayLog>): DayLog[] {
    const t = todayKey();
    return Array.from({ length: n }, (_, i) =>
        log({ date: parseDateKey(addDays(t, -i)).toISOString(), ...shape(i) }));
}

describe('sleepFocusObservation', () => {
    it('is suppressed below the minimum sample on either side', () => {
        // Four well-slept days is not evidence, however clean the contrast.
        const logs = [
            ...days(MIN_SAMPLE - 1, () => ({ sleep: 8, focus: 9 })),
            ...days(MIN_SAMPLE + 5, () => ({ sleep: 3, focus: 2 })),
        ];
        expect(sleepFocusObservation(logs)).toBeNull();
    });

    it('is suppressed when only one side has enough days', () => {
        const logs = days(20, () => ({ sleep: 8, focus: 9 }));
        expect(sleepFocusObservation(logs)).toBeNull();
    });

    it('reports once both groups clear the minimum and the gap is real', () => {
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 8, focus: 8 })),
            ...days(MIN_SAMPLE, () => ({ sleep: 3, focus: 4 })),
        ];
        const o = sleepFocusObservation(logs);
        expect(o).not.toBeNull();
        expect(o!.sampleSize).toBe(MIN_SAMPLE * 2);
    });

    it('suppresses a gap too small to be worth a sentence', () => {
        // 0.5 points across ten days is noise. Reporting it would teach the
        // user to discount the findings that are real.
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 8, focus: 5.5 })),
            ...days(MIN_SAMPLE, () => ({ sleep: 3, focus: 5 })),
        ];
        expect(sleepFocusObservation(logs)).toBeNull();
    });

    it('states association, never causation', () => {
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 9, focus: 9 })),
            ...days(MIN_SAMPLE, () => ({ sleep: 2, focus: 3 })),
        ];
        const text = sleepFocusObservation(logs)!.text;
        // No causal verb may appear: "improves", "because", "leads to", "affects".
        expect(text).not.toMatch(/улучшает|повышает|из-за|потому|приводит|влия|вызыва/i);
        // It must say what was observed, in the past tense.
        expect(text).toMatch(/был|была|было/i);
    });

    it('reports the direction that the data actually shows', () => {
        // Deliberately inverted: less sleep, better focus. The engine must not
        // assume the expected direction.
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 8, focus: 3 })),
            ...days(MIN_SAMPLE, () => ({ sleep: 3, focus: 8 })),
        ];
        expect(sleepFocusObservation(logs)!.text).toContain('ниже');
    });

    it('ignores days with a non-numeric focus rather than counting them as zero', () => {
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 8, focus: 8 })),
            ...days(MIN_SAMPLE, () => ({ sleep: 3, focus: 4 })),
            ...days(3, () => ({ sleep: 8, focus: Number.NaN })),
        ];
        expect(sleepFocusObservation(logs)!.sampleSize).toBe(MIN_SAMPLE * 2);
    });
});

describe('frequentBlockerObservation', () => {
    it('is suppressed with too few days overall', () => {
        const logs = days(MIN_SAMPLE - 1, () => ({ hindered: ['шум'] }));
        expect(frequentBlockerObservation(logs)).toBeNull();
    });

    it('is suppressed when no single tag reaches the minimum', () => {
        // Plenty of days, but the blockers are all different — there is no
        // pattern to report, only a list.
        const logs = days(20, i => ({ hindered: [`причина-${i}`] }));
        expect(frequentBlockerObservation(logs)).toBeNull();
    });

    it('reports the most frequent tag once it clears the minimum', () => {
        const logs = [
            ...days(MIN_SAMPLE + 2, () => ({ hindered: ['шум'] })),
            ...days(3, () => ({ hindered: ['усталость'] })),
        ];
        const o = frequentBlockerObservation(logs)!;
        expect(o.text).toContain('шум');
        expect(o.text).not.toContain('усталость');
    });

    it('shows the count against the total, so the reader can judge it', () => {
        const logs = days(MIN_SAMPLE + 5, i => ({ hindered: i < MIN_SAMPLE + 1 ? ['шум'] : [] }));
        const o = frequentBlockerObservation(logs)!;
        expect(o.text).toContain(String(MIN_SAMPLE + 1));
        expect(o.text).toContain(String(logs.length));
    });

    it('tolerates days with no hindered list at all', () => {
        // Records written before the field existed simply omit it. Under
        // `exactOptionalPropertyTypes` an omitted key and an explicit
        // `undefined` are different types, and it is the omitted one that
        // actually exists in users' stored data.
        const logs = days(MIN_SAMPLE + 2, () => ({})).map(l => {
            const { hindered: _drop, ...rest } = l;
            return rest as DayLog;
        });
        expect(frequentBlockerObservation(logs)).toBeNull();
    });
});

describe('todaysObservation', () => {
    it('returns null when there is nothing worth saying', () => {
        expect(todaysObservation([])).toBeNull();
        expect(todaysObservation(days(3, () => ({})))).toBeNull();
    });

    it('only considers logs inside the window', () => {
        // A clean signal, but all of it is older than the window.
        const old = Array.from({ length: MIN_SAMPLE * 2 }, (_, i) =>
            log({ date: parseDateKey(addDays(todayKey(), -60 - i)).toISOString(), sleep: i < MIN_SAMPLE ? 9 : 2, focus: i < MIN_SAMPLE ? 9 : 2 }));
        expect(todaysObservation(old, 30)).toBeNull();
    });

    it('returns exactly one observation, never a list', () => {
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 9, focus: 9, hindered: ['шум'] })),
            ...days(MIN_SAMPLE, () => ({ sleep: 2, focus: 3, hindered: ['шум'] })),
        ];
        const o = todaysObservation(logs);
        expect(o).not.toBeNull();
        expect(Array.isArray(o)).toBe(false);
    });

    it('is stable within a day and rotates across days', () => {
        const logs = [
            ...days(MIN_SAMPLE, () => ({ sleep: 9, focus: 9, hindered: ['шум'] })),
            ...days(MIN_SAMPLE, () => ({ sleep: 2, focus: 3, hindered: ['шум'] })),
        ];
        vi.useFakeTimers();

        vi.setSystemTime(new Date(2026, 7, 28, 9, 0));
        const morning = todaysObservation(logs)!.id;
        vi.setSystemTime(new Date(2026, 7, 28, 21, 0));
        // Same day: the card must not change under the user mid-day.
        expect(todaysObservation(logs)!.id).toBe(morning);

        // Across enough days the other candidate must come up, or the rotation
        // is not rotating and one sentence becomes permanent furniture.
        const seen = new Set<string>();
        for (let d = 0; d < 8; d++) {
            vi.setSystemTime(new Date(2026, 7, 22 + d, 12, 0));
            const o = todaysObservation(logs);
            if (o) seen.add(o.id);
        }
        expect(seen.size).toBeGreaterThan(1);
    });
});
