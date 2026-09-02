// Gamification layer: XP, levels and achievements.
//
// Everything here is DERIVED from data the app already stores (day logs,
// habits, kanban, gym history, test results). Nothing new has to be tracked,
// so past activity counts retroactively and there is no migration.

import { toLocalDateKey, daysBetween } from './datetime';
import type { DayLog, Habit, KanbanTask, GymData, TestResult } from '../types/domain';
import { lastOf, type NonEmptyArray } from './nonEmpty';

export type GameData = {
    logs: DayLog[];
    habits: Habit[];
    kanban: KanbanTask[];
    gymData: GymData;
    testResults: TestResult[];
};

// `key` and the achievement `id`s below are stored — `gequ_ach` holds unlocked
// ids — so they stay identifiers and the reader-facing text is a key beside them.
export const XP_RULES = [
    { key: 'day', labelKey: 'insights:xp.rule.day', icon: '🌙', xp: 10 },
    { key: 'habit', labelKey: 'insights:xp.rule.habit', icon: '♻️', xp: 5 },
    { key: 'task', labelKey: 'insights:xp.rule.task', icon: '✅', xp: 15 },
    { key: 'workout', labelKey: 'insights:xp.rule.workout', icon: '🏋️', xp: 50 },
    { key: 'test', labelKey: 'insights:xp.rule.test', icon: '🎓', xp: 30 },
    { key: 'gratitude', labelKey: 'insights:xp.rule.gratitude', icon: '💖', xp: 10 },
] as const;

export type XpBreakdown = { key: string; labelKey: string; icon: string; count: number; xp: number };

export function computeXp(data: GameData): { total: number; breakdown: XpBreakdown[] } {
    const logs = data.logs ?? [];
    const habits = data.habits ?? [];
    const kanban = data.kanban ?? [];
    const workouts = data.gymData?.history ?? [];
    const tests = data.testResults ?? [];

    const counts: Record<string, number> = {
        day: logs.length,
        habit: habits.reduce((sum: number, h) => sum + (h.history?.length ?? 0), 0),
        task: kanban.filter((t) => t.status === 'done').length,
        workout: workouts.length,
        test: tests.length,
        gratitude: logs.reduce((sum: number, l) => sum + (l.gratitude?.length ?? 0), 0),
    };

    const breakdown = XP_RULES.map(rule => ({
        key: rule.key,
        labelKey: rule.labelKey,
        icon: rule.icon,
        count: counts[rule.key] ?? 0,
        xp: (counts[rule.key] ?? 0) * rule.xp,
    }));

    return { total: breakdown.reduce((s, b) => s + b.xp, 0), breakdown };
}

// Level curve: reaching level L costs 100 * (L-1) XP for that step, so the
// cumulative requirement grows quadratically but stays reachable.
export function xpToReach(level: number): number {
    return 50 * level * (level - 1); // cumulative XP needed to BE at `level`
}

export type LevelInfo = {
    level: number;
    intoLevel: number;   // XP earned inside the current level
    levelSpan: number;   // XP needed to finish the current level
    progress: number;    // 0..1
};

export function levelFromXp(totalXp: number): LevelInfo {
    let level = 1;
    while (xpToReach(level + 1) <= totalXp && level < 100) level++;
    const base = xpToReach(level);
    const next = xpToReach(level + 1);
    const levelSpan = Math.max(next - base, 1);
    const intoLevel = totalXp - base;
    return { level, intoLevel, levelSpan, progress: Math.min(intoLevel / levelSpan, 1) };
}

// --- Story chapters -------------------------------------------------------

export const CHAPTERS: NonEmptyArray<{ from: number; to: number; titleKey: string; textKey: string }> = [
    { from: 1, to: 10, titleKey: 'insights:xp.chapter.1.title', textKey: 'insights:xp.chapter.1.text' },
    { from: 11, to: 25, titleKey: 'insights:xp.chapter.2.title', textKey: 'insights:xp.chapter.2.text' },
    { from: 26, to: 50, titleKey: 'insights:xp.chapter.3.title', textKey: 'insights:xp.chapter.3.text' },
    { from: 51, to: 100, titleKey: 'insights:xp.chapter.4.title', textKey: 'insights:xp.chapter.4.text' },
];

export function chapterFor(level: number) {
    return CHAPTERS.find(c => level >= c.from && level <= c.to) ?? lastOf(CHAPTERS);
}

// --- Achievements ---------------------------------------------------------

export type Achievement = {
    id: string;
    icon: string;
    titleKey: string;
    descKey: string;
    /** Current progress toward `goal` (also used to render a progress bar). */
    progress: (d: GameData) => number;
    goal: number;
};

/** Longest run of consecutive days in a list of dates, counted in the user's timezone. */
function longestDayStreak(dates: string[]): number {
    const days = [...new Set(dates.map(toLocalDateKey))].filter(Boolean).sort();
    if (days.length === 0) return 0;
    let best = 1, run = 1;
    for (let i = 1; i < days.length; i++) {
        run = daysBetween(days[i - 1]!, days[i]!) === 1 ? run + 1 : 1;
        best = Math.max(best, run);
    }
    return best;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'phoenix', icon: '🔥', titleKey: 'insights:xp.achievement.phoenix.title', descKey: 'insights:xp.achievement.phoenix.desc', goal: 7,
        progress: d => longestDayStreak((d.logs ?? []).map((l) => l.date)),
    },
    {
        id: 'marathon', icon: '🏃', titleKey: 'insights:xp.achievement.marathon.title', descKey: 'insights:xp.achievement.marathon.desc', goal: 30,
        progress: d => longestDayStreak((d.logs ?? []).map((l) => l.date)),
    },
    {
        id: 'owl', icon: '🌙', titleKey: 'insights:xp.achievement.owl.title', descKey: 'insights:xp.achievement.owl.desc', goal: 10,
        progress: d => (d.logs ?? []).filter((l) => Number(l.sleep) >= 8).length,
    },
    {
        id: 'iron', icon: '💪', titleKey: 'insights:xp.achievement.iron.title', descKey: 'insights:xp.achievement.iron.desc', goal: 100,
        progress: d => (d.gymData?.history ?? []).length,
    },
    {
        id: 'first-sweat', icon: '🏋️', titleKey: 'insights:xp.achievement.first-sweat.title', descKey: 'insights:xp.achievement.first-sweat.desc', goal: 1,
        progress: d => (d.gymData?.history ?? []).length,
    },
    {
        id: 'genius', icon: '🎓', titleKey: 'insights:xp.achievement.genius.title', descKey: 'insights:xp.achievement.genius.desc', goal: 50,
        progress: d => (d.testResults ?? []).length,
    },
    {
        id: 'sunny', icon: '😊', titleKey: 'insights:xp.achievement.sunny.title', descKey: 'insights:xp.achievement.sunny.desc', goal: 30,
        progress: d => (d.logs ?? []).reduce((s: number, l) => s + (l.gratitude?.length ?? 0), 0),
    },
    {
        id: 'rocket', icon: '🚀', titleKey: 'insights:xp.achievement.rocket.title', descKey: 'insights:xp.achievement.rocket.desc', goal: 10,
        progress: d => (d.kanban ?? []).filter((t) => t.status === 'done').length,
    },
    {
        id: 'centurion', icon: '🎯', titleKey: 'insights:xp.achievement.centurion.title', descKey: 'insights:xp.achievement.centurion.desc', goal: 100,
        progress: d => (d.kanban ?? []).filter((t) => t.status === 'done').length,
    },
    {
        id: 'ritual', icon: '♻️', titleKey: 'insights:xp.achievement.ritual.title', descKey: 'insights:xp.achievement.ritual.desc', goal: 100,
        progress: d => (d.habits ?? []).reduce((s: number, h) => s + (h.history?.length ?? 0), 0),
    },
    {
        id: 'explorer', icon: '🗺️', titleKey: 'insights:xp.achievement.explorer.title', descKey: 'insights:xp.achievement.explorer.desc', goal: 5,
        progress: d => new Set((d.testResults ?? []).map((t) => t.type)).size,
    },
    {
        id: 'balanced', icon: '⚖️', titleKey: 'insights:xp.achievement.balanced.title', descKey: 'insights:xp.achievement.balanced.desc', goal: 10,
        progress: d => (d.logs ?? []).filter((l) => Number(l.mood) >= 8).length,
    },
];

export type AchievementState = Achievement & { current: number; unlocked: boolean; ratio: number };

export function evaluateAchievements(data: GameData): AchievementState[] {
    return ACHIEVEMENTS.map(a => {
        const current = Math.max(0, a.progress(data));
        return { ...a, current, unlocked: current >= a.goal, ratio: Math.min(current / a.goal, 1) };
    }).sort((x, y) => Number(y.unlocked) - Number(x.unlocked) || y.ratio - x.ratio);
}
