import { useCheckins, selectTodayLog } from './checkins.store';
import { useHabits } from './habits.store';
import { useTasks } from './tasks.store';
import { useBody } from './body.store';
import { useCognitive } from './cognitive.store';
import { computeXp, levelFromXp, type LevelInfo } from '../lib/xp';
import { toLocalDateKey, todayKey } from '../lib/datetime';
import type { DayLog } from '../types/domain';

// Values computed across several stores.
//
// These are hooks rather than plain selectors because they read from more than
// one store. Each one subscribes only to the slices it actually uses, so a
// journal edit does not recompute the energy score.

/**
 * The day's energy, 0–10.
 *
 * Weighted from the check-in (sleep 0.4, mood 0.3, focus 0.3), nudged by
 * whether the day included a workout or a cognitive session, and docked for
 * self-reported blockers. Defaults to the midpoint before the day is closed —
 * an unrated day is unknown, not bad.
 */
export function useEnergy(): number {
    const todayLog = useCheckins(selectTodayLog);
    const workouts = useBody(s => s.gym.history);
    const results = useCognitive(s => s.results);

    if (!todayLog) return 5;

    const today = todayKey();
    let energy = todayLog.sleep * 0.4 + todayLog.mood * 0.3 + todayLog.focus * 0.3;
    if (workouts.some(w => toLocalDateKey(w.date) === today)) energy += 0.3;
    if (results.some(t => toLocalDateKey(t.date) === today)) energy += 0.2;
    if (todayLog.hindered?.includes('Телефон')) energy -= 0.3;
    if (todayLog.hindered?.includes('Усталость')) energy -= 0.3;

    return Math.max(0, Math.min(10, energy));
}

/** XP level, derived from activity already recorded — nothing extra is tracked. */
export function useLevelInfo(): LevelInfo {
    const logs = useCheckins(s => s.logs);
    const habits = useHabits(s => s.habits);
    const kanban = useTasks(s => s.kanban);
    const gymData = useBody(s => s.gym);
    const testResults = useCognitive(s => s.results);

    return levelFromXp(computeXp({ logs, habits, kanban, gymData, testResults }).total);
}

export function useTodayLog(): DayLog | undefined {
    return useCheckins(selectTodayLog);
}
