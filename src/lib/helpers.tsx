import { streakLength, nowInstant } from './datetime';

/** Consecutive days of check-ins ending today (or yesterday, until the day is missed). */
export function calculateStreak(logs: any[]) {
    return streakLength((logs ?? []).map((l: any) => l.date));
}

export function saveResult(setTestResults: any, type: string, value: number) {
    setTestResults((prev: any[]) => [...prev, { id: Date.now(), date: nowInstant(), type, value }]);
}
