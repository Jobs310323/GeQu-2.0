import type { DayLog } from '../../types/domain';
import { toLocalDateKey } from '../../lib/datetime';

// The seed of the insights engine.
//
// Two rules hold here and will hold in Phase 10 when this grows into the full
// engine (baselines, confidence, effect sizes):
//
//   1. Below the minimum sample size an observation is SUPPRESSED, not hedged.
//      "Not enough data yet" is a real answer; a weak claim dressed in
//      qualifiers is not.
//   2. Language states association, never cause. The user's own data can show
//      that two things moved together. It cannot show that one produced the
//      other, and saying so would be a lie the user might act on.

/** Below this many days on each side of a comparison, nothing is reported. */
export const MIN_SAMPLE = 5;

export type Observation = {
    id: string;
    /** What was seen, phrased as an association. */
    text: string;
    /** How many days the comparison drew on, always shown alongside the claim. */
    sampleSize: number;
};

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Compares focus on well-slept days against poorly-slept ones.
 *
 * Returns null unless both groups clear `MIN_SAMPLE` and the gap is large
 * enough to be worth a sentence — a 0.2-point difference across six days is
 * noise, and presenting it as a finding would teach the user to distrust the
 * ones that are real.
 */
export function sleepFocusObservation(logs: DayLog[]): Observation | null {
    const rested = logs.filter(l => Number(l.sleep) >= 7).map(l => Number(l.focus)).filter(Number.isFinite);
    const tired = logs.filter(l => Number(l.sleep) <= 4).map(l => Number(l.focus)).filter(Number.isFinite);

    if (rested.length < MIN_SAMPLE || tired.length < MIN_SAMPLE) return null;

    const delta = round1(mean(rested) - mean(tired));
    if (Math.abs(delta) < 1) return null;

    const direction = delta > 0 ? 'выше' : 'ниже';
    return {
        id: 'sleep-focus',
        text: `В дни со сном 7+ твой фокус был в среднем на ${Math.abs(delta)} ${direction}, чем в дни со сном 4 и меньше.`,
        sampleSize: rested.length + tired.length,
    };
}

/** The tag most often marked as getting in the way, once it has appeared enough times. */
export function frequentBlockerObservation(logs: DayLog[]): Observation | null {
    if (logs.length < MIN_SAMPLE) return null;

    const counts = new Map<string, number>();
    logs.forEach(l => (l.hindered ?? []).forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < MIN_SAMPLE) return null;

    return {
        id: 'frequent-blocker',
        text: `«${top[0]}» ты отмечал как помеху в ${top[1]} из ${logs.length} оценённых дней — чаще всего остального.`,
        sampleSize: logs.length,
    };
}

/**
 * The single observation worth showing today, or null.
 *
 * One at a time on purpose: a list of findings is a report, and a report is
 * something to read later rather than notice now.
 */
export function todaysObservation(logs: DayLog[], windowDays = 30): Observation | null {
    const cutoff = Date.now() - windowDays * 86_400_000;
    const recent = logs.filter(l => new Date(l.date).getTime() >= cutoff);

    // Rotates by day so the same sentence is not the permanent furniture of the
    // Today screen.
    const candidates = [sleepFocusObservation(recent), frequentBlockerObservation(recent)]
        .filter((o): o is Observation => o !== null);
    if (candidates.length === 0) return null;

    const dayIndex = Number(toLocalDateKey(new Date()).replaceAll('-', '')) % candidates.length;
    return candidates[dayIndex] ?? candidates[0] ?? null;
}
