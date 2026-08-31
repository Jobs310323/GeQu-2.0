import { streakLength, nowInstant } from './datetime';
import type { DayLog, TestResult } from '../types/domain';
import type { Setter } from '../types/props';

/** Consecutive days of check-ins ending today (or yesterday, until the day is missed). */
export function calculateStreak(logs: DayLog[]) {
    return streakLength((logs ?? []).map(l => l.date));
}

export function saveResult(setTestResults: Setter<TestResult[]>, type: string, value: number) {
    setTestResults(prev => [...prev, { id: Date.now(), date: nowInstant(), type, value }]);
}

/**
 * A human-readable message from a caught value, with `fallback` when there
 * isn't one.
 *
 * `catch` binds `unknown` under `strict`, and a thrown value need not be an
 * Error at all — so this narrows once here instead of every call site widening
 * back to `any` to reach `.message`.
 */
export function errorMessage(e: unknown, fallback: string): string {
    return e instanceof Error && e.message ? e.message : fallback;
}
