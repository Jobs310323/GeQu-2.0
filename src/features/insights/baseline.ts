// Personal baselines.
//
// The user is their own control group. There is no population to compare them
// to — this app has no normative sample, and inventing one would be the exact
// fabrication the product principles forbid. So "is this a good focus day?"
// can only ever mean "compared to your own usual", and this module is what
// "usual" means.
//
// TWO CHOICES WORTH DEFENDING
//
// 1. MEDIAN, not mean. Self-rated numbers are dragged badly by rare extreme
//    days — one 2/10 after a bad night moves a 30-day mean by a third of a
//    point. A median ignores it. Telling someone "your mood is down" because of
//    one awful Tuesday is precisely the false finding this engine exists to
//    avoid.
//
// 2. MAD (median absolute deviation), not standard deviation, for spread. Same
//    reason, and it gives the number the engine actually needs: how much this
//    person normally varies day to day. A 0.5-point difference is noise for
//    someone whose focus swings by 3, and meaningful for someone whose never
//    moves. Only their own spread can tell those apart.

/** How much history a baseline needs before it describes anything. */
export const MIN_BASELINE_SAMPLE = 7;

/** Days at the end of the window treated as "recent". */
export const RECENT_WINDOW = 7;

export type Trend = 'rising' | 'falling' | 'steady';

export interface Baseline {
    /** Middle of the user's own range. Robust to occasional extreme days. */
    typical: number;
    /** Middle of their last few days. */
    recent: number;
    /**
     * Median absolute deviation — how far a normal day sits from typical.
     * The unit every comparison in this engine is expressed in.
     */
    spread: number;
    trend: Trend;
    sampleSize: number;
}

export function median(values: number[]): number {
    const xs = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (xs.length === 0) return 0;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid]! : ((xs[mid - 1]! + xs[mid]!) / 2);
}

/**
 * Median absolute deviation: the median of how far each value sits from the
 * median. Zero when every value is identical, which callers must handle — a
 * person with no variation has no scale to measure a difference against.
 */
export function mad(values: number[]): number {
    const xs = values.filter(Number.isFinite);
    if (xs.length === 0) return 0;
    const m = median(xs);
    return median(xs.map(v => Math.abs(v - m)));
}

/**
 * Describes a metric against the user's own history.
 *
 * Returns null below `MIN_BASELINE_SAMPLE`. A "baseline" from four days is not
 * a baseline, and presenting one would give every later comparison a false
 * anchor.
 *
 * `values` must be in chronological order, oldest first.
 */
export function baselineFor(values: number[]): Baseline | null {
    const xs = values.filter(Number.isFinite);
    if (xs.length < MIN_BASELINE_SAMPLE) return null;

    const typical = median(xs);
    const spread = mad(xs);
    const recentValues = xs.slice(-RECENT_WINDOW);
    const recent = median(recentValues);

    return { typical, recent, spread, trend: trendOf(typical, recent, spread), sampleSize: xs.length };
}

/**
 * Whether recent days sit meaningfully away from typical.
 *
 * "Meaningfully" is one MAD — one normal day's worth of variation. Anything
 * smaller is the person being themselves, and calling it a trend would teach
 * them to distrust the times it is real.
 *
 * A person with zero spread (every day rated identically) gets `steady`: there
 * is no scale on which to call anything a change.
 */
export function trendOf(typical: number, recent: number, spread: number): Trend {
    if (spread <= 0) return 'steady';
    const delta = recent - typical;
    if (Math.abs(delta) < spread) return 'steady';
    return delta > 0 ? 'rising' : 'falling';
}

/**
 * A difference expressed in the user's own units of variation.
 *
 * 1.0 means "a normal day's worth of difference". This is the only scale on
 * which two people's numbers would even be comparable — which is not something
 * this app does, but it is why the measure is the right one for comparing a
 * person to themselves over time.
 *
 * Returns null when there is no spread to divide by.
 */
export function effectSize(delta: number, spread: number): number | null {
    if (!Number.isFinite(delta) || spread <= 0) return null;
    return Math.abs(delta) / spread;
}
