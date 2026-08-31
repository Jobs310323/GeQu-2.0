import type { DayLog } from '../../types/domain';
import { toLocalDateKey } from '../../lib/datetime';
import { baselineFor, effectSize, median, type Baseline } from './baseline';
import { CLAIM_LABEL, MIN_SAMPLE, confidenceFrom, renderable, type Insight } from './types';

// The insights engine.
//
// Grows `observe.ts` into something that can carry several detectors without
// loosening either of the two rules that file established:
//
//   1. Below the minimum sample an insight is SUPPRESSED, not hedged. "Not
//      enough data yet" is a real answer; a weak claim dressed in qualifiers is
//      a way of saying something while pretending not to.
//   2. Language states association, never cause. A person's own data can show
//      that two things moved together. It cannot show that one produced the
//      other, and saying so is a lie the user might act on — by changing their
//      sleep, their medication, their work.
//
// What Phase 10 adds is EFFECT SIZE. Sample size alone lets through a
// statistically-fine, practically-meaningless difference: 0.3 points across
// forty days is not something to tell anyone. Every comparison is now measured
// in the user's own median absolute deviation, so "meaningful" means "larger
// than this person's ordinary day-to-day variation" rather than a number
// someone picked.

export type { Insight };
export { CLAIM_LABEL, MIN_SAMPLE };

type Metric = 'sleep' | 'focus' | 'mood';

const METRIC_LABEL: Record<Metric, string> = {
    sleep: 'сон', focus: 'фокус', mood: 'настроение',
};

/** Logs inside the window, oldest first. */
function windowed(logs: DayLog[], windowDays: number): DayLog[] {
    const cutoff = Date.now() - windowDays * 86_400_000;
    return logs
        .filter(l => new Date(l.date).getTime() >= cutoff)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const values = (logs: DayLog[], metric: Metric): number[] =>
    logs.map(l => Number(l[metric])).filter(Number.isFinite);

/**
 * How a metric currently sits against the user's own usual.
 *
 * The plainest kind of insight and the most useful: no comparison between
 * variables, no room to imply cause. Just "this is your normal, this is where
 * you are".
 */
export function baselineInsight(logs: DayLog[], metric: Metric, windowDays = 30): Insight | null {
    const inWindow = windowed(logs, windowDays);
    const base = baselineFor(values(inWindow, metric));
    if (!base) return null;

    const delta = base.recent - base.typical;
    const effect = effectSize(delta, base.spread);

    // Steady is worth saying — it is information, and it is the honest reading
    // most of the time. It carries no effect size because it is not a claim
    // that anything changed.
    if (base.trend === 'steady' || effect === null) {
        return finish({
            id: `baseline-${metric}`,
            claim: 'observed',
            text: `Твой обычный ${METRIC_LABEL[metric]} за ${windowDays} дней — около ${round(base.typical)}. Последняя неделя держится примерно там же.`,
            sampleSize: base.sampleSize,
            windowDays,
            baseline: base,
        });
    }

    const direction = base.trend === 'rising' ? 'выше' : 'ниже';
    return finish({
        id: `baseline-${metric}`,
        claim: 'observed',
        text: `Твой обычный ${METRIC_LABEL[metric]} — около ${round(base.typical)}. Последняя неделя идёт ${direction}: примерно ${round(base.recent)}.`,
        sampleSize: base.sampleSize,
        windowDays,
        effectSize: effect,
        baseline: base,
    });
}

/**
 * Whether one metric differs on days when another was high versus low.
 *
 * Deliberately phrased as co-occurrence. The user could equally have focused
 * badly *because* they slept badly, slept badly *because* they were anxious
 * about the day ahead, or both from a third cause. The data distinguishes none
 * of those, so neither does the sentence.
 */
export function associationInsight(
    logs: DayLog[],
    driver: Metric,
    outcome: Metric,
    windowDays = 30,
): Insight | null {
    const inWindow = windowed(logs, windowDays);
    if (inWindow.length < MIN_SAMPLE * 2) return null;

    const driverValues = values(inWindow, driver);
    const split = median(driverValues);
    const spread = baselineFor(values(inWindow, outcome))?.spread ?? 0;

    const high = inWindow.filter(l => Number(l[driver]) > split).map(l => Number(l[outcome])).filter(Number.isFinite);
    const low = inWindow.filter(l => Number(l[driver]) < split).map(l => Number(l[outcome])).filter(Number.isFinite);

    // Both sides need enough days. A comparison where one side is three days is
    // not a comparison.
    if (high.length < MIN_SAMPLE || low.length < MIN_SAMPLE) return null;

    const delta = median(high) - median(low);
    const effect = effectSize(delta, spread);
    if (effect === null) return null;

    const direction = delta > 0 ? 'выше' : 'ниже';
    return finish({
        id: `assoc-${driver}-${outcome}`,
        claim: 'associated',
        text: `В дни, когда ${METRIC_LABEL[driver]} был выше обычного, ${METRIC_LABEL[outcome]} был в среднем ${direction} на ${round(Math.abs(delta))}. Это совпадение по дням, а не доказанная причина.`,
        sampleSize: high.length + low.length,
        windowDays,
        effectSize: effect,
    });
}

/** The tag most often marked as getting in the way. A count, so `observed`. */
export function blockerInsight(logs: DayLog[], windowDays = 30): Insight | null {
    const inWindow = windowed(logs, windowDays);
    if (inWindow.length < MIN_SAMPLE) return null;

    const counts = new Map<string, number>();
    inWindow.forEach(l => (l.hindered ?? []).forEach(t => counts.set(t, (counts.get(t) ?? 0) + 1)));

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top || top[1] < MIN_SAMPLE) return null;

    return finish({
        id: 'blocker',
        claim: 'observed',
        text: `«${top[0]}» ты отмечал как помеху в ${top[1]} из ${inWindow.length} оценённых дней — чаще всего остального.`,
        sampleSize: inWindow.length,
        windowDays,
    });
}

/** How consistently the user is logging at all. Nothing to over-read. */
export function coverageInsight(logs: DayLog[], windowDays = 30): Insight | null {
    const inWindow = windowed(logs, windowDays);
    if (inWindow.length < MIN_SAMPLE) return null;

    const distinctDays = new Set(inWindow.map(l => toLocalDateKey(l.date))).size;
    return finish({
        id: 'coverage',
        claim: 'observed',
        text: `За последние ${windowDays} дней ты оценил ${distinctDays}. Всё остальное здесь опирается только на них.`,
        sampleSize: distinctDays,
        windowDays,
    });
}

/**
 * Every insight worth showing right now, most informative first.
 *
 * Runs every detector and filters through `renderable`, so a detector that
 * forgets a check cannot ship a claim past the gate.
 */
export function allInsights(logs: DayLog[], windowDays = 30): Insight[] {
    const candidates = [
        associationInsight(logs, 'sleep', 'focus', windowDays),
        associationInsight(logs, 'sleep', 'mood', windowDays),
        baselineInsight(logs, 'focus', windowDays),
        baselineInsight(logs, 'mood', windowDays),
        baselineInsight(logs, 'sleep', windowDays),
        blockerInsight(logs, windowDays),
        coverageInsight(logs, windowDays),
    ].filter((i): i is Insight => i !== null);

    return candidates.filter(renderable);
}

function finish(partial: Omit<Insight, 'confidence'>): Insight {
    return { ...partial, confidence: confidenceFrom(partial.sampleSize) };
}

const round = (n: number) => Math.round(n * 10) / 10;

export type { Baseline };
