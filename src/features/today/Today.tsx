import { useMemo } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icons';
import { useCheckins, selectTodayLog } from '../../stores/checkins.store';
import { useHabits } from '../../stores/habits.store';
import { useTasks, openTasksOf } from '../../stores/tasks.store';
import { useCalendar, selectUpcomingCount } from '../../stores/calendar.store';
import { useEnergy } from '../../stores/derived';
import { calculateStreak } from '../../lib/helpers';
import { todayKey } from '../../lib/datetime';
import { NextAction } from './NextAction';
import { TodayHabit } from './TodayHabit';
import { TodayInsight } from './TodayInsight';

/**
 * The Today surface — the first screen, and the one the rest of the product
 * exists to serve.
 *
 * It answers four questions and deliberately nothing else:
 *
 *   How am I doing?          the state strip
 *   What matters today?      priorities
 *   What should I do next?   a single next action
 *   What did I learn?        one insight, or nothing
 *
 * Everything else is one step away. A dashboard that shows every metric the
 * system holds has told the user nothing — see docs/PRODUCT_PRINCIPLES.md.
 */
export function Today() {
    const todayLog = useCheckins(selectTodayLog);
    const logs = useCheckins(s => s.logs);
    const energy = useEnergy();
    const habits = useHabits(s => s.habits);
    const kanban = useTasks(s => s.kanban);
    const openTasks = useMemo(() => openTasksOf(kanban), [kanban]);
    const dueCount = useCalendar(selectUpcomingCount);

    const streak = calculateStreak(logs);
    const doneToday = habits.filter(h => h.history.includes(todayKey())).length;
    const dayClosed = Boolean(todayLog);

    const dateLabel = new Date().toLocaleDateString('ru-RU', {
        weekday: 'long', day: 'numeric', month: 'long',
    });

    return (
        <div className="max-w-3xl mx-auto pb-8">
            <header className="mb-6">
                <p className="text-sm text-[var(--text-muted)] first-letter:uppercase">{dateLabel}</p>
                <h1 className="text-2xl font-semibold mt-0.5">
                    {greeting()}
                </h1>
            </header>

            {/* How am I doing — three numbers, not thirty. */}
            <section aria-labelledby="today-state" className="mb-6">
                <h2 id="today-state" className="sr-only">Состояние</h2>
                <div className="grid grid-cols-3 gap-3">
                    <StateTile
                        label="Энергия"
                        value={dayClosed ? energy.toFixed(1) : '—'}
                        hint={dayClosed ? energyWord(energy) : 'день не закрыт'}
                        tone={dayClosed ? energyTone(energy) : 'text-[var(--text-muted)]'}
                    />
                    <StateTile
                        label="Серия"
                        value={streak > 0 ? String(streak) : '—'}
                        hint={streak > 0 ? dayWord(streak) : 'пока нет'}
                        tone={streak > 0 ? 'text-[var(--text-main)]' : 'text-[var(--text-muted)]'}
                    />
                    <StateTile
                        label="Привычки"
                        value={habits.length ? `${doneToday}/${habits.length}` : '—'}
                        hint={habits.length ? 'сегодня' : 'ещё не заведены'}
                        tone={habits.length && doneToday === habits.length ? 'text-green-400' : 'text-[var(--text-main)]'}
                    />
                </div>
            </section>

            {/* What should I do next — exactly one thing. */}
            <NextAction
                dayClosed={dayClosed}
                openTasks={openTasks}
                habits={habits}
                doneToday={doneToday}
            />

            {/* What matters today. */}
            <section aria-labelledby="today-priorities" className="mt-6">
                <div className="flex items-baseline justify-between mb-3">
                    <h2 id="today-priorities" className="text-sm font-medium text-[var(--text-muted)]">
                        Сегодня
                    </h2>
                    <Link to="/plan/tasks" className="text-xs text-cyan-400 hover:underline">
                        Все задачи
                    </Link>
                </div>

                {openTasks.length === 0 ? (
                    <EmptyLine
                        text="Открытых задач нет."
                        actionLabel="Добавить задачу"
                        to="/plan/tasks"
                    />
                ) : (
                    <ul className="space-y-1.5">
                        {priorityOrder(openTasks).slice(0, 3).map(task => (
                            <li key={task.id}>
                                <Link
                                    to="/plan/tasks"
                                    className="glass-card rounded-xl px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition"
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                            task.priority === 'high' ? 'bg-red-400'
                                                : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-[var(--text-muted)]'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="flex-1 text-sm leading-snug">{task.text}</span>
                                    {task.status === 'doing' && (
                                        <span className="text-[10px] uppercase tracking-wide text-cyan-400 shrink-0">
                                            в работе
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}

                {dueCount > 0 && (
                    <Link
                        to="/plan/calendar"
                        className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] transition"
                    >
                        <Icon name="bell" size={12} />
                        {dueCount} {reminderWord(dueCount)} впереди
                    </Link>
                )}
            </section>

            <TodayHabit />
            <TodayInsight />
        </div>
    );
}

function greeting(): string {
    const h = new Date().getHours();
    if (h < 5) return 'Ещё не спишь?';
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
}

function StateTile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
    return (
        <div className="glass-card rounded-2xl p-3.5">
            <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
            <div className={`text-2xl font-semibold leading-none mt-1.5 tabular-nums ${tone}`}>{value}</div>
            <div className="text-[11px] text-[var(--text-muted)] mt-1">{hint}</div>
        </div>
    );
}

export function EmptyLine({ text, actionLabel, to }: { text: string; actionLabel: string; to: string }) {
    return (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="text-sm text-[var(--text-muted)]">{text}</span>
            <Link to={to} className="text-xs text-cyan-400 hover:underline shrink-0">{actionLabel}</Link>
        </div>
    );
}

/** Urgent first, then in-progress, so the top of the list is the top of the mind. */
function priorityOrder<T extends { priority: string; status: string }>(tasks: T[]): T[] {
    const weight = (t: T) =>
        (t.priority === 'high' ? 0 : t.priority === 'medium' ? 1 : 2) + (t.status === 'doing' ? -0.5 : 0);
    return [...tasks].sort((a, b) => weight(a) - weight(b));
}

const energyWord = (e: number) => (e >= 7 ? 'полный заряд' : e >= 4 ? 'средний' : 'на исходе');
const energyTone = (e: number) => (e >= 7 ? 'text-green-400' : e >= 4 ? 'text-yellow-400' : 'text-red-400');

/** Russian needs three plural forms; `Intl.PluralRules` picks the right one. */
const plural = (n: number, one: string, few: string, many: string) => {
    const form = new Intl.PluralRules('ru-RU').select(n);
    return form === 'one' ? one : form === 'few' ? few : many;
};
const dayWord = (n: number) => `${plural(n, 'день', 'дня', 'дней')} подряд`;
const reminderWord = (n: number) => plural(n, 'напоминание', 'напоминания', 'напоминаний');
