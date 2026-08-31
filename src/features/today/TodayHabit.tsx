import { Link } from 'react-router';
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
                <h2 id="today-habit" className="text-sm font-medium text-[var(--text-muted)]">Привычка</h2>
                <Link to="/track/habits" className="text-xs text-cyan-400 hover:underline">
                    Все ({pending.length} осталось)
                </Link>
            </div>

            <div className="glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3">
                <button
                    onClick={() => toggle(pick.id)}
                    aria-label={`Отметить «${pick.name}» выполненной сегодня`}
                    className="w-9 h-9 rounded-xl border border-[var(--border)] text-[var(--text-muted)] flex items-center justify-center shrink-0 hover:border-green-400 hover:text-green-400 transition"
                >
                    <Icon name="check" size={17} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="font-medium leading-snug truncate">{pick.name}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">
                        {run > 0 ? `${run} подряд — не разрывай` : 'Ещё не начата'}
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
