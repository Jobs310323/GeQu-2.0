// Gamification layer: XP, levels and achievements.
//
// Everything here is DERIVED from data the app already stores (day logs,
// habits, kanban, gym history, test results). Nothing new has to be tracked,
// so past activity counts retroactively and there is no migration.

export type GameData = {
    logs: any[];
    habits: any[];
    kanban: any[];
    gymData: any;
    testResults: any[];
};

export const XP_RULES = [
    { key: 'day', label: 'Закрытие дня', icon: '🌙', xp: 10 },
    { key: 'habit', label: 'Выполненная привычка', icon: '♻️', xp: 5 },
    { key: 'task', label: 'Закрытая задача', icon: '✅', xp: 15 },
    { key: 'workout', label: 'Тренировка', icon: '🏋️', xp: 50 },
    { key: 'test', label: 'Когнитивный тест', icon: '🎓', xp: 30 },
    { key: 'gratitude', label: 'Благодарность', icon: '💖', xp: 10 },
] as const;

export type XpBreakdown = { key: string; label: string; icon: string; count: number; xp: number };

export function computeXp(data: GameData): { total: number; breakdown: XpBreakdown[] } {
    const logs = data.logs ?? [];
    const habits = data.habits ?? [];
    const kanban = data.kanban ?? [];
    const workouts = data.gymData?.history ?? [];
    const tests = data.testResults ?? [];

    const counts: Record<string, number> = {
        day: logs.length,
        habit: habits.reduce((sum: number, h: any) => sum + (h.history?.length ?? 0), 0),
        task: kanban.filter((t: any) => t.status === 'done').length,
        workout: workouts.length,
        test: tests.length,
        gratitude: logs.reduce((sum: number, l: any) => sum + (l.gratitude?.length ?? 0), 0),
    };

    const breakdown = XP_RULES.map(rule => ({
        key: rule.key,
        label: rule.label,
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

export const CHAPTERS = [
    { from: 1, to: 10, title: 'Глава 1: Начало', text: 'Ты только начинаешь путь. Каждый день — маленькая победа.' },
    { from: 11, to: 25, title: 'Глава 2: Первые успехи', text: 'Ты чувствуешь силу ритуалов. Привычки закрепляются.' },
    { from: 26, to: 50, title: 'Глава 3: Мастерство', text: 'Ты знаешь свои паттерны. Рутина — твой союзник, а не враг.' },
    { from: 51, to: 100, title: 'Глава 4: Мудрость', text: 'Ты управляешь своим состоянием осознанно. Система работает на тебя.' },
];

export function chapterFor(level: number) {
    return CHAPTERS.find(c => level >= c.from && level <= c.to) ?? CHAPTERS[CHAPTERS.length - 1];
}

// --- Achievements ---------------------------------------------------------

export type Achievement = {
    id: string;
    icon: string;
    title: string;
    desc: string;
    /** Current progress toward `goal` (also used to render a progress bar). */
    progress: (d: GameData) => number;
    goal: number;
};

/** Longest run of consecutive days present in a list of YYYY-MM-DD strings. */
function longestDayStreak(dates: string[]): number {
    const days = [...new Set(dates)].map(d => new Date(d).setHours(0, 0, 0, 0)).sort((a, b) => a - b);
    if (days.length === 0) return 0;
    let best = 1, run = 1;
    for (let i = 1; i < days.length; i++) {
        if (days[i] - days[i - 1] === 86400000) run++;
        else if (days[i] !== days[i - 1]) run = 1;
        best = Math.max(best, run);
    }
    return best;
}

export const ACHIEVEMENTS: Achievement[] = [
    {
        id: 'phoenix', icon: '🔥', title: 'Феникс', desc: '7 дней подряд закрывал день', goal: 7,
        progress: d => longestDayStreak((d.logs ?? []).map((l: any) => l.date)),
    },
    {
        id: 'marathon', icon: '🏃', title: 'Марафонец', desc: '30 дней подряд закрывал день', goal: 30,
        progress: d => longestDayStreak((d.logs ?? []).map((l: any) => l.date)),
    },
    {
        id: 'owl', icon: '🌙', title: 'Совёнок', desc: 'Сон ≥ 8/10 десять раз', goal: 10,
        progress: d => (d.logs ?? []).filter((l: any) => Number(l.sleep) >= 8).length,
    },
    {
        id: 'iron', icon: '💪', title: 'Железный человек', desc: '100 тренировок', goal: 100,
        progress: d => (d.gymData?.history ?? []).length,
    },
    {
        id: 'first-sweat', icon: '🏋️', title: 'Первый подход', desc: 'Первая тренировка в зале', goal: 1,
        progress: d => (d.gymData?.history ?? []).length,
    },
    {
        id: 'genius', icon: '🎓', title: 'Гений', desc: '50 когнитивных тестов', goal: 50,
        progress: d => (d.testResults ?? []).length,
    },
    {
        id: 'sunny', icon: '😊', title: 'Солнечный', desc: '30 записей благодарности', goal: 30,
        progress: d => (d.logs ?? []).reduce((s: number, l: any) => s + (l.gratitude?.length ?? 0), 0),
    },
    {
        id: 'rocket', icon: '🚀', title: 'Ракета', desc: 'Закрыто 10 задач', goal: 10,
        progress: d => (d.kanban ?? []).filter((t: any) => t.status === 'done').length,
    },
    {
        id: 'centurion', icon: '🎯', title: 'Центурион', desc: 'Закрыто 100 задач', goal: 100,
        progress: d => (d.kanban ?? []).filter((t: any) => t.status === 'done').length,
    },
    {
        id: 'ritual', icon: '♻️', title: 'Ритуал', desc: '100 выполненных привычек', goal: 100,
        progress: d => (d.habits ?? []).reduce((s: number, h: any) => s + (h.history?.length ?? 0), 0),
    },
    {
        id: 'explorer', icon: '🗺️', title: 'Исследователь', desc: 'Попробовал 5 разных тестов', goal: 5,
        progress: d => new Set((d.testResults ?? []).map((t: any) => t.type)).size,
    },
    {
        id: 'balanced', icon: '⚖️', title: 'Равновесие', desc: 'Настроение ≥ 8/10 десять раз', goal: 10,
        progress: d => (d.logs ?? []).filter((l: any) => Number(l.mood) >= 8).length,
    },
];

export type AchievementState = Achievement & { current: number; unlocked: boolean; ratio: number };

export function evaluateAchievements(data: GameData): AchievementState[] {
    return ACHIEVEMENTS.map(a => {
        const current = Math.max(0, a.progress(data));
        return { ...a, current, unlocked: current >= a.goal, ratio: Math.min(current / a.goal, 1) };
    }).sort((x, y) => Number(y.unlocked) - Number(x.unlocked) || y.ratio - x.ratio);
}
