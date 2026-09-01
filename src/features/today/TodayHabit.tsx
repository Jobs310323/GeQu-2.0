import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { useHabits } from '../../stores/habits.store';
import { todayKey, addDays } from '../../lib/datetime';

/**
 * One habit, tickable without leaving Today.
 *
 * Shows the habit with the longest run still unticked today — the one with the
 * most to lose. Nothing renders once they are all done, rather than a "0
 * remaining" card taking up space for the rest of the day.
 */
export function TodayHabit() {
    const { t } = useTranslation('today');
    const habits = useHabits(s => s.habits);
    const toggle = useHabits(s => s.toggle);
    const today = todayKey();

    const pending = habits.filter(h => !h.history.includes(today));
    if (habits.length === 0 || pending.length === 0) return null;

    const pick = [...pending].sort((a, b) => runLength(b.history, today) - runLength(a.history, today))[0];
    if (!pick) return null;

    const run = runLength(pick.history, today);

    return (
        <section aria-labelledby="today-habit" className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
                <h2 id="today-habit" className="t-small font-medium text-[var(--gq-text-tertiary)]">{t('habit.heading')}</h2>
                <Link to="/track/habits" className="t-caption text-cyan-400 hover:underline">
                    {t('habit.all', { count: pending.length })}
                </Link>
            </div>

            <div className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <button
                    onClick={() => toggle(pick.id)}
                    aria-label={t('habit.mark', { name: pick.name })}
                    className="w-9 h-9 rounded-xl border border-[var(--border)] text-[var(--gq-text-tertiary)] flex items-center justify-center shrink-0 hover:border-success hover:text-success transition"
                >
                    <Icon name="check" size={17} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug truncate">{pick.name}</div>
                    <div className="t-caption mt-0.5">
                        {run > 0 ? t('habit.run', { count: run }) : t('habit.notStarted')}
                    </div>
                </div>
            </div>
        </section>
    );
}

/** Consecutive completed days ending yesterday — what today's tick would extend. */
function runLength(history: string[], today: string): number {
    const done = new Set(history);
    let run = 0;
    for (let i = 1; ; i++) {
        if (!done.has(addDays(today, -i))) break;
        run++;
    }
    return run;
}
