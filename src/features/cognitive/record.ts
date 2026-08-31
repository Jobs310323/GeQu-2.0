import type { TestResult } from '../../types/domain';
import type { Setter } from '../../types/props';
import { nowInstant } from '../../lib/datetime';
import { engineFor } from './registry';
import { historyFor, scoreAttempt } from './scoring';

/**
 * Records one attempt, with everything needed to interpret it later.
 *
 * Replaces `saveResult(setResults, 'schulte', 38.4)`, which stored a bare number
 * and left every consumer to guess what it meant. The call site is barely
 * different; the record is.
 *
 * `value` is still the raw score and is still first, so nothing that reads
 * results today has to change — the envelope is additive.
 */
export function recordAttempt(
    setResults: Setter<TestResult[]>,
    type: string,
    rawScore: number,
    opts: { durationMs?: number } = {},
): void {
    setResults(previous => {
        const engine = engineFor(type);

        // An exercise with no registry entry still gets recorded. Losing a
        // user's result because a lookup table is out of date would be a much
        // worse failure than storing it without an envelope.
        if (!engine) {
            return [...previous, { id: Date.now(), date: nowInstant(), type, value: rawScore }];
        }

        const scored = scoreAttempt(engine, rawScore, historyFor(engine, previous), opts);

        return [...previous, {
            id: Date.now(),
            date: nowInstant(),
            type,
            value: rawScore,
            testVersion: scored.testVersion,
            normalizedScore: scored.normalizedScore,
            ...(scored.percentile === undefined ? {} : { percentile: scored.percentile }),
            ...(scored.durationMs === undefined ? {} : { durationMs: scored.durationMs }),
            referencePopulation: scored.referencePopulation,
            confidence: scored.confidence,
            limitations: scored.limitations,
            deviceContext: scored.deviceContext,
        }];
    });
}
