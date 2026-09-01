import { useMemo } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { useCheckins, selectTodayLog } from '../../stores/checkins.store';
import { useHabits } from '../../stores/habits.store';
import { useTasks, openTasksOf } from '../../stores/tasks.store';
import { useCalendar, selectUpcomingCount } from '../../stores/calendar.store';
import { useEnergy } from '../../stores/derived';
import { calculateStreak } from '../../lib/helpers';
import { todayKey } from '../../lib/datetime';
import { formatDate, formatNumber } from '../../lib/format';
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
    const { t } = useTranslation('today');
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

    const dateLabel = formatDate(Date.now(), 'weekday');

    return (
        <div className="max-w-3xl mx-auto pb-8">
            <header className="mb-6">
                <p className="t-small text-[var(--gq-text-tertiary)] first-letter:uppercase">{dateLabel}</p>
                <h1 className="t-h1 mt-0.5">
                    {t(`greeting.${greetingSlot()}`)}
                </h1>
            </header>

            {/* How am I doing — three numbers, not thirty. */}
            <section aria-labelledby="today-state" className="mb-6">
                <h2 id="today-state" className="sr-only">{t('state.heading')}</h2>
                <div className="grid grid-cols-3 gap-3">
                    <StateTile
                        label={t('state.energy')}
                        value={dayClosed ? formatNumber(energy, 1) : '—'}
                        hint={dayClosed ? t(`energy.${energyWord(energy)}`) : t('state.dayNotClosed')}
                        tone={dayClosed ? energyTone(energy) : 'text-[var(--gq-text-tertiary)]'}
                    />
                    <StateTile
                        label={t('state.streak')}
                        value={streak > 0 ? formatNumber(streak) : '—'}
                        hint={streak > 0 ? t('streak.inARow', { count: streak }) : t('state.none')}
                        tone={streak > 0 ? 'text-[var(--gq-text-primary)]' : 'text-[var(--gq-text-tertiary)]'}
                    />
                    <StateTile
                        label={t('state.habits')}
                        value={habits.length ? `${formatNumber(doneToday)}/${formatNumber(habits.length)}` : '—'}
                        hint={habits.length ? t('state.today') : t('state.noHabits')}
                        tone={habits.length && doneToday === habits.length ? 'text-success' : 'text-[var(--gq-text-primary)]'}
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
                    <h2 id="today-priorities" className="t-small font-medium text-[var(--gq-text-tertiary)]">
                        {t('tasks.today')}
                    </h2>
                    <Link to="/plan/tasks" className="t-caption text-cyan-400 hover:underline">
                        {t('tasks.all')}
                    </Link>
                </div>

                {openTasks.length === 0 ? (
                    <EmptyLine
                        text={t('tasks.empty')}
                        actionLabel={t('tasks.add')}
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
                                            task.priority === 'high' ? 'bg-danger'
                                                : task.priority === 'medium' ? 'bg-warning' : 'bg-[var(--gq-text-subtle)]'
                                        }`}
                                        aria-hidden="true"
                                    />
                                    <span className="flex-1 t-small">{task.text}</span>
                                    {task.status === 'doing' && (
                                        <span className="t-label text-cyan-400 shrink-0">
                                            {t('tasks.inProgress')}
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
                        className="mt-2 inline-flex items-center gap-1.5 t-caption hover:text-[var(--gq-text-primary)] transition"
                    >
                        <Icon name="bell" size={12} />
                        {t('reminders.ahead', { count: dueCount })}
                    </Link>
                )}
            </section>

            <TodayHabit />
            <TodayInsight />
        </div>
    );
}

/** Which of the four greetings the local clock calls for. */
function greetingSlot(): 'night' | 'morning' | 'afternoon' | 'evening' {
    const h = new Date().getHours();
    if (h < 5) return 'night';
    if (h < 12) return 'morning';
    if (h < 18) return 'afternoon';
    return 'evening';
}

function StateTile({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
    return (
        <div className="glass-card rounded-2xl p-3.5">
            <div className="t-label">{label}</div>
            <div className={`t-metric text-2xl leading-none mt-1.5 ${tone}`}>{value}</div>
            <div className="t-caption text-[11px] mt-1">{hint}</div>
        </div>
    );
}

export function EmptyLine({ text, actionLabel, to }: { text: string; actionLabel: string; to: string }) {
    return (
        <div className="glass-card rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <span className="t-small text-[var(--gq-text-tertiary)]">{text}</span>
            <Link to={to} className="t-caption text-cyan-400 hover:underline shrink-0">{actionLabel}</Link>
        </div>
    );
}

/** Urgent first, then in-progress, so the top of the list is the top of the mind. */
function priorityOrder<T extends { priority: string; status: string }>(tasks: T[]): T[] {
    const weight = (t: T) =>
        (t.priority === 'high' ? 0 : t.priority === 'medium' ? 1 : 2) + (t.status === 'doing' ? -0.5 : 0);
    return [...tasks].sort((a, b) => weight(a) - weight(b));
}

const energyWord = (e: number) => (e >= 7 ? 'full' : e >= 4 ? 'mid' : 'low');
const energyTone = (e: number) => (e >= 7 ? 'text-success' : e >= 4 ? 'text-warning' : 'text-danger');

// The hand-rolled `plural(n, 'день', 'дня', 'дней')` that used to live here is
// gone: i18next picks the plural category from `Intl.PluralRules` for whatever
// locale is active, so a language with a different number of forms than
// Russian's three needs no code change here at all.
