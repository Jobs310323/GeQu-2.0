// The cognitive engine's vocabulary.
//
// WHY THIS EXISTS
//
// Every exercise used to end with `saveResult(setTestResults, 'schulte', 38.4)`
// — a bare number in a `value` field. A Schulte time in seconds and an N-back
// accuracy percentage were stored identically, with nothing recording what the
// number meant, which variant produced it, how long the attempt took, or
// whether it was completed at all.
//
// That is fine while a human reads one number at a time. It stops being fine
// the moment anything *compares* them, which `lib/profile.ts` already does and
// the insights engine will do more of. "Your Schulte improved from 41 to 38" is
// not a finding unless both attempts were the same grid, neither was abandoned,
// and there are enough of them to distinguish a trend from a good afternoon.
//
// THE HONESTY CONSTRAINT
//
// `referencePopulation` is `'self'` and nothing else. These exercises are not
// standardised instruments, they run on unknown hardware in unknown conditions,
// and there is no normative sample behind them. A percentile here means "against
// your own previous attempts" — never against other people — and every surface
// that shows one has to say so.
//
// This is the same standard `lib/clinicalTests.ts` already holds itself to, now
// applied to the training half of the app.

/** Which half of the product a module belongs to. */
export type CognitiveMode =
    /** Practice. Repeated, scored loosely, meant to be fun. */
    | 'train'
    /** Measurement. Fixed protocol, results feed the profile. */
    | 'assess';

/** What kind of thinking an exercise loads. Used to group the UI. */
export type CognitiveDomain = 'attention' | 'memory' | 'executive' | 'processing' | 'regulation';

/**
 * A cognitive exercise, described rather than implemented.
 *
 * The component stays where it is; this records what its number means so that
 * everything downstream can reason about it without special-casing each id.
 */
export interface CognitiveEngine {
    id: string;
    label: string;
    /** Bumped when the task changes in a way that makes old scores incomparable. */
    version: string;
    domain: CognitiveDomain;
    mode: CognitiveMode;
    /** What the raw score is measured in, for display. */
    unit: string;
    /** True when a smaller number is a better result (times, latencies). */
    lowerIsBetter: boolean;
    /**
     * Plausible range of the raw score, used to normalise onto 0–100 before
     * enough personal history exists to do it from the user's own data.
     */
    plausibleRange: readonly [min: number, max: number];
    /**
     * What this exercise cannot tell you. Shown alongside results, because a
     * measurement without its caveats invites more confidence than it earns.
     */
    limitations: readonly string[];
}

/** Conditions of one attempt, recorded because they change the number. */
export interface DeviceContext {
    /** Touch and mouse produce materially different reaction times. */
    pointer: 'touch' | 'mouse' | 'unknown';
    /** Reduced motion removes animation cues some tasks rely on. */
    reducedMotion: boolean;
}

/**
 * How much weight a result deserves.
 *
 * Derived from how many comparable attempts exist, never asserted. `none` is a
 * real answer and the honest one for a first attempt.
 */
export type Confidence = 'none' | 'low' | 'moderate';

/** A scored attempt, ready to be stored. */
export interface ScoredAttempt {
    /** The number the exercise produced, in its own unit. Unchanged. */
    rawScore: number;
    /** 0–100, higher always better, comparable across exercises. */
    normalizedScore: number;
    /**
     * Where this attempt sits among the user's OWN previous attempts, 0–100.
     * Undefined until there are enough of them to mean anything.
     */
    percentile?: number;
    /** Always `'self'`. There is no normative sample and there will not be one. */
    referencePopulation: 'self';
    testVersion: string;
    durationMs?: number;
    deviceContext: DeviceContext;
    confidence: Confidence;
    limitations: readonly string[];
}
