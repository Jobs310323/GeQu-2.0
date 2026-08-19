// Pure scoring/aggregation logic for the Snowman feature — no JSX, no state,
// so it stays easy to reason about and reuse from both the page and analytics.
import { dayISO, shiftDays } from '../../lib/date';
import { DIFFICULTY_MULTIPLIER, SPHERES, type Activity, type DayRecord, type Difficulty, type Sphere } from './types';

export const todayStr = () => dayISO();

const round1 = (n: number) => Math.round(n * 10) / 10;

export function computePoints(minutes: number, difficulty: Difficulty): number {
    return round1((minutes / 10) * DIFFICULTY_MULTIPLIER[difficulty]);
}

/** Sphere totals for the day, clamped to the 0–10 scale the snowman renders on. */
export function computeScores(activities: Activity[]): DayRecord['scores'] {
    const sum = (sphere: Sphere) => activities.filter(a => a.sphere === sphere).reduce((s, a) => s + a.points, 0);
    return {
        intellect: round1(Math.min(10, sum('intellect'))),
        emotion: round1(Math.min(10, sum('emotion'))),
        body: round1(Math.min(10, sum('body'))),
    };
}

export function computeHarmony(scores: DayRecord['scores']): number {
    return Math.round(((scores.intellect + scores.emotion + scores.body) / 30) * 100);
}

export function findRecord(days: DayRecord[], date: string): DayRecord | undefined {
    return days.find(d => d.date === date);
}

function emptyRecord(date: string): DayRecord {
    return {
        date, activities: [], scores: { intellect: 0, emotion: 0, body: 0 },
        totalHarmony: 0, isEdited: false, editHistory: [], closedAt: null,
    };
}

/** A day is closed once it's no longer "today" — edits to it are retroactive. */
export function isClosedDay(record: DayRecord, today = todayStr()): boolean {
    return record.date !== today;
}

function recompute(record: DayRecord, today: string, editedRetroactively: boolean, changeDesc?: string): DayRecord {
    const scores = computeScores(record.activities);
    const totalHarmony = computeHarmony(scores);
    const closedAt = record.date !== today ? (record.closedAt ?? `${record.date}T23:59:59.999Z`) : null;
    if (!editedRetroactively) {
        return { ...record, scores, totalHarmony, closedAt };
    }
    return {
        ...record, scores, totalHarmony, closedAt, isEdited: true,
        editHistory: [...record.editHistory, { timestamp: new Date().toISOString(), changes: changeDesc ?? 'Изменена активность' }],
    };
}

/** Adds an activity to `date`'s record (creating it if needed) and returns a new `days` array. */
export function addActivity(days: DayRecord[], date: string, activity: Activity, today = todayStr()): DayRecord[] {
    const existing = findRecord(days, date) ?? emptyRecord(date);
    const wasClosed = isClosedDay(existing, today);
    const updated = recompute({ ...existing, activities: [...existing.activities, activity] }, today,
        wasClosed, `Добавлена активность «${activity.label}»`);
    const withoutOld = days.filter(d => d.date !== date);
    return [...withoutOld, updated].sort((a, b) => b.date.localeCompare(a.date));
}

export function updateActivity(days: DayRecord[], date: string, activityId: string, patch: Partial<Pick<Activity, 'minutes' | 'difficulty' | 'points'>>, today = todayStr()): DayRecord[] {
    const existing = findRecord(days, date);
    if (!existing) return days;
    const wasClosed = isClosedDay(existing, today);
    const activities = existing.activities.map(a => a.id === activityId ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a);
    const updated = recompute({ ...existing, activities }, today, wasClosed, 'Изменена активность');
    return days.map(d => d.date === date ? updated : d);
}

export function removeActivity(days: DayRecord[], date: string, activityId: string, today = todayStr()): DayRecord[] {
    const existing = findRecord(days, date);
    if (!existing) return days;
    const wasClosed = isClosedDay(existing, today);
    const removed = existing.activities.find(a => a.id === activityId);
    const activities = existing.activities.filter(a => a.id !== activityId);
    const updated = recompute({ ...existing, activities }, today, wasClosed, removed ? `Удалена активность «${removed.label}»` : 'Удалена активность');
    return days.map(d => d.date === date ? updated : d);
}

// --- Analytics -----------------------------------------------------------

function lastNDays(days: DayRecord[], n: number, before = todayStr()): DayRecord[] {
    return [...days].filter(d => d.date <= before).sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

export function averageBySphere(days: DayRecord[], n: number): Record<Sphere, number> {
    const recent = lastNDays(days, n);
    const avg = (sphere: Sphere) => recent.length
        ? round1(recent.reduce((s, d) => s + d.scores[sphere], 0) / recent.length) : 0;
    return { intellect: avg('intellect'), emotion: avg('emotion'), body: avg('body') };
}

export function mostHarmoniousDay(days: DayRecord[]): DayRecord | null {
    if (!days.length) return null;
    return days.reduce((best, d) => (!best || d.totalHarmony > best.totalHarmony) ? d : best, null as DayRecord | null);
}

const prevDate = (date: string) => shiftDays(-1, date);

/** Consecutive days (walking back from the most recent) where every sphere ≥ 8. */
export function currentStreak(days: DayRecord[]): number {
    const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    let expected: string | null = null;
    for (const d of sorted) {
        const balanced = d.scores.intellect >= 8 && d.scores.emotion >= 8 && d.scores.body >= 8;
        if (!balanced) break;
        if (expected !== null && d.date !== expected) break;
        streak++;
        expected = prevDate(d.date);
    }
    return streak;
}

export type Forecast = { sphere: Sphere; sphereLabel: string; avg: number; recommendation: string } | null;

/** Simple 7-day-moving-average heuristic: the sphere trailing furthest behind is "at risk". */
export function forecastTomorrow(days: DayRecord[]): Forecast {
    const recent = lastNDays(days, 7);
    if (recent.length < 3) return null;
    const avg = averageBySphere(days, 7);
    const weakest = SPHERES.reduce((min, s) => avg[s.id] < avg[min.id] ? s : min, SPHERES[0]);
    if (avg[weakest.id] >= 7) return null;
    return {
        sphere: weakest.id,
        sphereLabel: weakest.label,
        avg: avg[weakest.id],
        recommendation: `Завтра добавь 20 минут ${sphereActivityWord(weakest.id)} практики`,
    };
}

function sphereActivityWord(sphere: Sphere): string {
    if (sphere === 'intellect') return 'интеллектуальной';
    if (sphere === 'emotion') return 'эмоциональной';
    return 'телесной';
}

const SPHERE_GENITIVE: Record<Sphere, string> = { intellect: 'Интеллекта', emotion: 'Эмоций', body: 'Тела' };

/** True when today's spread between the strongest and weakest sphere is large. */
export function imbalanceBanner(record: DayRecord | undefined): { sphere: Sphere; sphereLabel: string; sphereGenitive: string; icon: string } | null {
    if (!record) return null;
    const { scores } = record;
    const entries = SPHERES.map(s => ({ ...s, value: scores[s.id] }));
    const min = entries.reduce((a, b) => b.value < a.value ? b : a);
    const max = entries.reduce((a, b) => b.value > a.value ? b : a);
    if (max.value - min.value <= 3) return null;
    return { sphere: min.id, sphereLabel: min.label, sphereGenitive: SPHERE_GENITIVE[min.id], icon: min.icon };
}
