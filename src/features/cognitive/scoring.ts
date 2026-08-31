import type { CognitiveEngine, Confidence, DeviceContext, ScoredAttempt } from './types';
import type { TestResult } from '../../types/domain';

// Turning a raw number into something that can be compared — and being explicit
// about what it can be compared TO.
//
// The only reference population is the user themselves. These exercises are not
// standardised instruments: they run on unknown hardware, in unknown conditions,
// with no normative sample behind them. So a percentile here means "against your
// own previous attempts under similar conditions" and nothing else, and it is
// withheld entirely until there are enough attempts for that to mean something.
//
// The temptation this module exists to resist is inventing authority. It would
// be easy to publish "you scored in the 73rd percentile" and much harder to
// justify it. `MIN_ATTEMPTS_FOR_PERCENTILE` is where that line sits.

/** Below this many comparable attempts, no percentile is reported at all. */
export const MIN_ATTEMPTS_FOR_PERCENTILE = 5;
/** Below this, a result carries no claim to reliability. */
export const MIN_ATTEMPTS_FOR_CONFIDENCE = 3;
/** Above this, `moderate` — the highest this module will ever claim. */
export const ATTEMPTS_FOR_MODERATE_CONFIDENCE = 10;

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Puts a raw score on a 0–100 scale where higher is always better.
 *
 * Uses the user's own observed range once there is one, and the engine's
 * declared plausible range before that. The distinction matters: the plausible
 * range is a display convenience so a first result is not a bare number, while
 * the personal range is a real statement about that person's own spread.
 */
export function normalize(engine: CognitiveEngine, raw: number, history: number[]): number {
    if (!Number.isFinite(raw)) return 0;

    const observed = history.filter(Number.isFinite);
    let lo: number;
    let hi: number;

    if (observed.length >= MIN_ATTEMPTS_FOR_CONFIDENCE) {
        lo = Math.min(...observed, raw);
        hi = Math.max(...observed, raw);
    } else {
        [lo, hi] = engine.plausibleRange;
    }

    // A flat range (every attempt identical, or a degenerate declared range)
    // has no spread to place the value in. Mid-scale is the honest answer.
    if (hi === lo) return 50;

    const position = clamp((raw - lo) / (hi - lo), 0, 1);
    return Math.round((engine.lowerIsBetter ? 1 - position : position) * 100);
}

/**
 * Where this attempt sits among the user's own previous ones, 0–100.
 *
 * Returns undefined below `MIN_ATTEMPTS_FOR_PERCENTILE`. That is deliberate: a
 * percentile computed from three numbers is arithmetic, not information, and
 * showing it would invite exactly the over-reading this module exists to
 * prevent.
 */
export function personalPercentile(
    engine: CognitiveEngine, raw: number, history: number[],
): number | undefined {
    const observed = history.filter(Number.isFinite);
    if (observed.length < MIN_ATTEMPTS_FOR_PERCENTILE) return undefined;

    const beaten = observed.filter(v => (engine.lowerIsBetter ? raw < v : raw > v)).length;
    return Math.round((beaten / observed.length) * 100);
}

/** How much weight this result deserves, from how much history stands behind it. */
export function confidenceFor(attempts: number): Confidence {
    if (attempts < MIN_ATTEMPTS_FOR_CONFIDENCE) return 'none';
    if (attempts < ATTEMPTS_FOR_MODERATE_CONFIDENCE) return 'low';
    // `moderate` is the ceiling. Nothing here earns "high": the conditions are
    // uncontrolled and the instruments are not validated.
    return 'moderate';
}

/** Reads the conditions that materially change a score. */
export function readDeviceContext(): DeviceContext {
    const pointer: DeviceContext['pointer'] =
        typeof matchMedia !== 'function' ? 'unknown'
            : matchMedia('(pointer: coarse)').matches ? 'touch'
            : matchMedia('(pointer: fine)').matches ? 'mouse'
            : 'unknown';

    const reducedMotion = typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches;

    return { pointer, reducedMotion };
}

/**
 * Scores one attempt against the user's own history of the same exercise.
 *
 * `history` should be the raw scores of previous attempts at this exercise
 * only — mixing exercises would compare seconds with percentages.
 */
export function scoreAttempt(
    engine: CognitiveEngine,
    raw: number,
    history: number[],
    opts: { durationMs?: number; context?: DeviceContext } = {},
): ScoredAttempt {
    const percentile = personalPercentile(engine, raw, history);
    return {
        rawScore: raw,
        normalizedScore: normalize(engine, raw, history),
        ...(percentile === undefined ? {} : { percentile }),
        referencePopulation: 'self',
        testVersion: engine.version,
        ...(opts.durationMs === undefined ? {} : { durationMs: opts.durationMs }),
        deviceContext: opts.context ?? readDeviceContext(),
        confidence: confidenceFor(history.length),
        limitations: engine.limitations,
    };
}

/**
 * Previous raw scores for one exercise, oldest first.
 *
 * Only counts attempts on the same `testVersion` where one is recorded. A
 * version bump means the task changed enough that old scores are not comparable,
 * and silently mixing them would make a trend out of a rule change. Records
 * predating the envelope have no version and are included — they were produced
 * by version 1.0.0 by definition.
 */
export function historyFor(engine: CognitiveEngine, results: TestResult[]): number[] {
    return results
        .filter(r => r.type === engine.id)
        .filter(r => r.testVersion === undefined || r.testVersion === engine.version)
        .map(r => Number(r.value))
        .filter(Number.isFinite);
}
