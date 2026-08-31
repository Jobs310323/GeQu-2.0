import { useState, useEffect } from 'react';
import { callAIJson } from '../lib/ai';
import { DB } from '../lib/db';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { todayKey } from '../lib/datetime';
import type { AiPlanProps } from '../types/props';
import { errorMessage } from '../lib/helpers';

/** What gets written to `gequ_aiplan`: today's plan, so a revisit does not regenerate it. */
type CachedPlan = {
    /** Calendar date the plan was generated for; a plan for another day is discarded. */
    date: string;
    plan: Plan;
    savedAt?: string;
    accepted?: boolean;
};

type Block = {
    time: string;
    title: string;
    why?: string;
    kind?: 'task' | 'test' | 'break' | 'gym' | 'habit' | 'closing' | string;
    taskId?: number | null;
};
type Deferred = { taskId: number; text?: string; reason: string };
type Plan = {
    greeting?: string;
    energyNote?: string;
    blocks?: Block[];
    deferred?: Deferred[];
    tip?: string;
};

const KIND_ICON: Record<string, string> = {
    task: 'target', test: 'flask', break: 'pause', gym: 'dumbbell', habit: 'repeat', closing: 'moon',
};

const PLANNER_SYSTEM = `Ты — проактивный ассистент по планированию дня в приложении GeQu. Пользователь — человек с СДВГ: ему нужны короткие блоки, ясные формулировки и бережный тон.

Тебе дают JSON с контекстом: уровень энергии (0–10), оценки сна/фокуса/настроения, задачи из Канбана с приоритетами и id, невыполненные сегодня привычки, сколько дней назад был последний когнитивный тест и последняя тренировка, текущее время.

Составь реалистичное расписание на остаток дня. Правила:
- Тяжёлые задачи ставь на высокую энергию, при низкой энергии (< 4) — щади: меньше задач, больше пауз, начни с самого лёгкого.
- Блоки короткие: 25–60 минут для работы, 5–15 минут для пауз и тестов.
- Обязательно вставь паузу/дыхание и закрытие дня вечером.
- Если тренировки не было 3+ дня — предложи зал. Если когнитивного теста не было 3+ дня — предложи короткий тест.
- Не более 8 блоков. Время начинай не раньше текущего времени.
- Если задач больше 6, часть перенеси в deferred с короткой причиной.
- Для блоков, взятых из Канбана, обязательно укажи taskId из входных данных. Для остальных ставь taskId: null.

Отвечай СТРОГО одним JSON-объектом по схеме:
{"greeting": "короткое тёплое приветствие", "energyNote": "1 предложение про энергию сегодня", "blocks": [{"time": "08:00–09:00", "title": "что делать", "why": "зачем, кратко", "kind": "task|test|break|gym|habit|closing", "taskId": число или null}], "deferred": [{"taskId": число, "reason": "почему перенёс"}], "tip": "одна полезная заметка"}

Весь текст — по-русски и строго на «ты» (никаких «вы», «давайте», «ваш»). Тон тёплый и поддерживающий. Никакого текста вне JSON.`;

export function AiPlan({ logs, kanban, setKanban, habits, gymData, testResults, energy }: AiPlanProps) {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [accepted, setAccepted] = useState(false);
    const [savedAt, setSavedAt] = useState<string>('');

    // Restore today's cached plan so it isn't regenerated on every visit.
    useEffect(() => {
        const cached = DB.get<CachedPlan | null>('aiplan', null);
        if (cached && cached.date === todayKey()) {
            setPlan(cached.plan);
            setSavedAt(cached.savedAt || '');
            setAccepted(!!cached.accepted);
        }
    }, []);

    const daysSince = (dates: string[]): number | null => {
        if (!dates.length) return null;
        const newest = Math.max(...dates.map(d => new Date(d).getTime()));
        return Math.floor((Date.now() - newest) / 86400000);
    };

    const buildContext = () => {
        const today = todayKey();
        const todayLog = logs.find((l) => l.date.split('T')[0] === today);
        const openTasks = kanban
            .filter((t) => t.status === 'todo' || t.status === 'doing')
            .map((t) => ({ id: t.id, text: t.text, priority: t.priority, status: t.status }));
        const undoneHabits = habits
            .filter((h) => !(h.history || []).includes(today))
            .map((h) => h.name);

        return {
            currentTime: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
            energy: Number(energy.toFixed(1)),
            today: todayLog ? { sleep: todayLog.sleep, focus: todayLog.focus, mood: todayLog.mood } : null,
            dayClosed: !!todayLog,
            openTasks,
            undoneHabits,
            daysSinceWorkout: daysSince((gymData?.history ?? []).map((w) => w.date)),
            daysSinceCognitiveTest: daysSince((testResults ?? []).map((t) => t.date)),
        };
    };

    const generate = async () => {
        setLoading(true);
        setError('');
        setAccepted(false);
        try {
            const ctx = buildContext();
            const result = await callAIJson<Plan>({
                system: PLANNER_SYSTEM,
                prompt: `Контекст:\n${JSON.stringify(ctx, null, 2)}\n\nСоставь план на остаток дня.`,
                maxTokens: 1600,
            });
            const stamp = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            setPlan(result);
            setSavedAt(stamp);
            DB.save('aiplan', { date: todayKey(), plan: result, savedAt: stamp, accepted: false });
        } catch (e) {
            setError(errorMessage(e, 'Не удалось составить план.'));
        } finally {
            setLoading(false);
        }
    };

    // Accepting the plan moves its Kanban tasks into "В процессе".
    const acceptPlan = () => {
        const ids = (plan?.blocks ?? [])
            .map(b => b.taskId)
            .filter((id): id is number => typeof id === 'number');
        if (ids.length) {
            setKanban(kanban.map((t) => (ids.includes(t.id) && t.status === 'todo' ? { ...t, status: 'doing' } : t)));
        }
        setAccepted(true);
        const cached = DB.get<CachedPlan | null>('aiplan', null);
        if (cached) DB.save('aiplan', { ...cached, accepted: true });
    };

    const movedCount = (plan?.blocks ?? []).filter(b => typeof b.taskId === 'number').length;

    return (
        <div className="max-w-3xl">
            <PageHeader page="aiplan" title="ИИ-план дня"
                subtitle="Соберу твою энергию, задачи и привычки — и предложу расписание на остаток дня." />

            <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/25 bg-cyan-400/5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <div className="text-sm text-gray-400">Энергия сейчас</div>
                        <div className="text-3xl font-bold text-white">{energy.toFixed(1)}<span className="text-base text-gray-500">/10</span></div>
                        {savedAt && <div className="text-xs text-gray-500 mt-1">План составлен в {savedAt}</div>}
                    </div>
                    <button onClick={generate} disabled={loading}
                        className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40 whitespace-nowrap">
                        {loading ? 'Составляю…' : plan ? 'Пересобрать план' : 'Составить план дня'}
                    </button>
                </div>
                {error && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}
            </div>

            {loading && !plan && (
                <div className="glass-card p-8 rounded-2xl text-center text-gray-500 animate-pulse">
                    Смотрю на твою энергию, задачи и привычки…
                </div>
            )}

            {plan && (
                <div className="anim-fade-in space-y-6">
                    {(plan.greeting || plan.energyNote) && (
                        <div className="glass-card p-6 rounded-2xl">
                            {plan.greeting && <p className="text-lg text-white mb-1">{plan.greeting}</p>}
                            {plan.energyNote && <p className="text-sm text-gray-400">{plan.energyNote}</p>}
                        </div>
                    )}

                    {(plan.blocks ?? []).length > 0 && (
                        <div className="glass-card p-6 rounded-2xl">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Icon name="calendar" size={18} className="text-cyan-400" />
                                План на сегодня
                            </h2>
                            <div className="space-y-3">
                                {plan.blocks!.map((b, i) => (
                                    <div key={i} className="flex gap-4 items-start bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                        <div className="w-8 h-8 rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon name={KIND_ICON[b.kind ?? ''] ?? 'clock'} size={16} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-baseline gap-2">
                                                <span className="text-cyan-400 font-bold tabular-nums text-sm">{b.time}</span>
                                                <span className="text-white">{b.title}</span>
                                            </div>
                                            {b.why && <div className="text-xs text-gray-500 mt-1">{b.why}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-5 flex flex-wrap items-center gap-4">
                                <button onClick={acceptPlan} disabled={accepted}
                                    className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold px-6 py-2.5 rounded-lg disabled:opacity-40 flex items-center gap-2">
                                    <Icon name="check" size={16} />
                                    {accepted ? 'План принят' : 'Принять план'}
                                </button>
                                <span className="text-xs text-gray-500">
                                    {accepted
                                        ? 'Задачи из плана перенесены в «В процессе».'
                                        : movedCount > 0
                                            ? `Перенесёт ${movedCount} задач(и) в «В процессе»`
                                            : 'В плане нет задач из Канбана'}
                                </span>
                            </div>
                        </div>
                    )}

                    {(plan.deferred ?? []).length > 0 && (
                        <div className="glass-card p-6 rounded-2xl">
                            <h2 className="text-xl font-bold mb-1 flex items-center gap-2">
                                <Icon name="clock" size={18} className="text-[var(--text-muted)]" />
                                Перенёс на потом
                            </h2>
                            <p className="text-xs text-gray-500 mb-4">Чтобы сегодня не перегружаться.</p>
                            <div className="space-y-2">
                                {plan.deferred!.map((d, i) => {
                                    const task = kanban.find((t) => t.id === d.taskId);
                                    return (
                                        <div key={i} className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border)]">
                                            <div className="text-sm text-gray-300">{task?.text ?? d.text ?? 'Задача'}</div>
                                            <div className="text-xs text-gray-500 mt-0.5">{d.reason}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {plan.tip && (
                        <div className="glass-card p-5 rounded-2xl border border-purple-400/30 bg-purple-400/5">
                            <div className="flex gap-3">
                                <Icon name="sparkle" size={18} className="text-purple-400 shrink-0 mt-0.5" />
                                <p className="text-sm text-gray-300">{plan.tip}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
