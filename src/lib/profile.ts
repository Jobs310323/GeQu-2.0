// Aggregates every data source in the app into a compact, factual profile.
//
// The numbers are computed here in JS rather than asked of the model: it is
// exact, costs no tokens, and keeps the AI's job to interpretation only.

import { computeXp, levelFromXp, evaluateAchievements, type GameData } from './xp';

/** Cognitive tests where a LOWER value is better (times/latency). */
export const LOWER_IS_BETTER = new Set(['schulte', 'reaction', 'tmt']);

export const TEST_LABELS: Record<string, string> = {
    schulte: 'Таблица Шульте (сек)',
    stroop: 'Тест Струпа (очки)',
    reaction: 'Реакция (мс)',
    tmt: 'Соединения (сек)',
    digitspan: 'Память на числа (уровень)',
    gonogo: 'Go/No-Go (очки)',
    nback: 'N-Back (% точности)',
    corsi: 'Тест Корси (длина)',
    arithmetic: 'Устный счёт (очки)',
    switching: 'Переключение (очки)',
};

export type TestSummary = {
    type: string;
    label: string;
    count: number;
    first: number;
    last: number;
    best: number;
    average: number;
    lowerIsBetter: boolean;
    improvedPct: number | null; // positive = got better
};

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n: number, d = 1) => Number(n.toFixed(d));

function tagCounts(logs: any[], field: 'helped' | 'hindered') {
    const counts: Record<string, number> = {};
    logs.forEach(l => (l[field] ?? []).forEach((t: string) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([tag, n]) => ({ tag, n }));
}

function currentStreak(logs: any[]): number {
    const days = [...new Set(logs.map(l => new Date(l.date).setHours(0, 0, 0, 0)))].sort((a, b) => b - a);
    if (!days.length) return 0;
    const today = new Date().setHours(0, 0, 0, 0);
    if (days[0] !== today && days[0] !== today - 86400000) return 0;
    let streak = 1;
    for (let i = 0; i < days.length - 1; i++) {
        if (days[i] - days[i + 1] === 86400000) streak++;
        else break;
    }
    return streak;
}

export function buildProfile(d: {
    logs: any[]; diary: any[]; habits: any[]; kanban: any[];
    goals: any[]; gymData: any; testResults: any[];
}) {
    const logs = d.logs ?? [];
    const sorted = [...logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const cutoff = Date.now() - 30 * 86400000;
    const recent = sorted.filter(l => new Date(l.date).getTime() >= cutoff);

    const nums = (arr: any[], k: string) => arr.map(l => Number(l[k])).filter(n => Number.isFinite(n));

    // --- cognitive tests, per type with a real trend ---
    const byType: Record<string, any[]> = {};
    (d.testResults ?? []).forEach(t => { (byType[t.type] ||= []).push(t); });
    const tests: TestSummary[] = Object.entries(byType).map(([type, list]) => {
        const chrono = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const vals = chrono.map(t => Number(t.value)).filter(n => Number.isFinite(n));
        const lower = LOWER_IS_BETTER.has(type);
        const first = vals[0] ?? 0;
        const last = vals[vals.length - 1] ?? 0;
        // Compare the first third against the last third so one outlier can't skew it.
        const chunk = Math.max(1, Math.floor(vals.length / 3));
        const early = avg(vals.slice(0, chunk));
        const late = avg(vals.slice(-chunk));
        let improvedPct: number | null = null;
        if (vals.length >= 3 && early > 0) {
            const delta = lower ? (early - late) / early : (late - early) / early;
            improvedPct = round(delta * 100, 0);
        }
        return {
            type, label: TEST_LABELS[type] ?? type, count: vals.length,
            first: round(first), last: round(last),
            best: vals.length ? round(lower ? Math.min(...vals) : Math.max(...vals)) : 0,
            average: round(avg(vals)), lowerIsBetter: lower, improvedPct,
        };
    }).sort((a, b) => b.count - a.count);

    // --- gym ---
    const workouts = d.gymData?.history ?? [];
    let tonnage = 0;
    const muscleTonnage: Record<string, number> = {};
    const exerciseCount: Record<string, number> = {};
    workouts.forEach((w: any) => (w.exercises ?? []).forEach((ex: any) => {
        exerciseCount[ex.name] = (exerciseCount[ex.name] || 0) + 1;
        (ex.sets ?? []).forEach((s: any) => {
            if (!s.done) return;
            const t = (Number(s.weight) || 0) * (Number(s.reps) || 0);
            tonnage += t;
            if (ex.muscle) muscleTonnage[ex.muscle] = (muscleTonnage[ex.muscle] || 0) + t;
        });
    }));

    // --- habits ---
    const spanDays = sorted.length
        ? Math.max(1, Math.round((Date.now() - new Date(sorted[0].date).getTime()) / 86400000))
        : 1;
    const habits = (d.habits ?? []).map((h: any) => ({
        name: h.name,
        done: h.history?.length ?? 0,
        ratePct: round(((h.history?.length ?? 0) / spanDays) * 100, 0),
    })).sort((a, b) => b.done - a.done);

    // --- tasks & goals ---
    const kanban = d.kanban ?? [];
    const goals = (d.goals ?? []).map((g: any) => ({
        title: g.title,
        done: (g.tasks ?? []).filter((t: any) => t.done).length,
        total: (g.tasks ?? []).length,
    }));

    // --- gamification ---
    const gameData: GameData = {
        logs, habits: d.habits ?? [], kanban, gymData: d.gymData ?? {}, testResults: d.testResults ?? [],
    };
    const { total: xp } = computeXp(gameData);
    const level = levelFromXp(xp);
    const achievements = evaluateAchievements(gameData);

    return {
        period: {
            firstEntry: sorted[0]?.date?.split('T')[0] ?? null,
            lastEntry: sorted[sorted.length - 1]?.date?.split('T')[0] ?? null,
            daysTracked: logs.length,
            spanDays,
        },
        state: {
            allTime: {
                sleep: round(avg(nums(sorted, 'sleep'))),
                focus: round(avg(nums(sorted, 'focus'))),
                mood: round(avg(nums(sorted, 'mood'))),
            },
            last30Days: {
                entries: recent.length,
                sleep: round(avg(nums(recent, 'sleep'))),
                focus: round(avg(nums(recent, 'focus'))),
                mood: round(avg(nums(recent, 'mood'))),
            },
            currentStreak: currentStreak(logs),
        },
        helpedTop: tagCounts(sorted, 'helped'),
        hinderedTop: tagCounts(sorted, 'hindered'),
        habits,
        tasks: {
            done: kanban.filter((t: any) => t.status === 'done').length,
            inProgress: kanban.filter((t: any) => t.status === 'doing').length,
            todo: kanban.filter((t: any) => t.status === 'todo').length,
            highPriorityOpen: kanban.filter((t: any) => t.status !== 'done' && t.priority === 'high').length,
        },
        goals,
        gym: {
            workouts: workouts.length,
            totalTonnageKg: Math.round(tonnage),
            topExercises: Object.entries(exerciseCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, n]) => ({ name, n })),
            muscleTonnage: Object.fromEntries(Object.entries(muscleTonnage).map(([m, t]) => [m, Math.round(t)])),
        },
        cognitive: tests,
        journal: {
            entries: (d.diary ?? []).length,
            gratitudeEntries: logs.reduce((s: number, l: any) => s + (l.gratitude?.length ?? 0), 0),
            // A few recent excerpts give the model qualitative colour without a token blowout.
            recentExcerpts: (d.diary ?? []).slice(0, 6).map((e: any) => ({
                date: e.date?.split('T')[0],
                text: String(e.content ?? '').slice(0, 300),
            })),
        },
        gamification: {
            xp, level: level.level,
            achievementsUnlocked: achievements.filter(a => a.unlocked).map(a => a.title),
            achievementsTotal: achievements.length,
        },
    };
}

export type Profile = ReturnType<typeof buildProfile>;

/** True when there is enough history for a card to say anything meaningful. */
export function hasEnoughData(p: Profile): boolean {
    return p.period.daysTracked > 0 || p.cognitive.length > 0 || p.gym.workouts > 0 || p.journal.entries > 0;
}
