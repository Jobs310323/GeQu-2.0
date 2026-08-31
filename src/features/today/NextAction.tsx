import { Link } from 'react-router';
import { Icon } from '../../components/Icons';
import type { KanbanTask, Habit } from '../../types/domain';

type Props = {
    dayClosed: boolean;
    openTasks: KanbanTask[];
    habits: Habit[];
    doneToday: number;
};

/**
 * One suggested next step — never a list.
 *
 * The whole point is to remove the decision, so this picks exactly one thing
 * and says why. Offering three "next actions" would hand the choice straight
 * back, which is the friction the surface exists to remove.
 *
 * The order is deliberate: something already started beats something new, an
 * unstarted urgent task beats a habit, and closing the day comes last because
 * it is reflection, not action.
 */
export function NextAction({ dayClosed, openTasks, habits, doneToday }: Props) {
    const suggestion = suggest({ dayClosed, openTasks, habits, doneToday });
    if (!suggestion) return null;

    return (
        <section aria-labelledby="next-action">
            <h2 id="next-action" className="text-sm font-medium text-[var(--text-muted)] mb-3">
                Дальше
            </h2>
            <Link
                to={suggestion.to}
                className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:bg-white/5 transition group"
            >
                <span className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Icon name={suggestion.icon} size={20} />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block font-medium leading-snug">{suggestion.title}</span>
                    <span className="block text-sm text-[var(--text-muted)] mt-0.5">{suggestion.why}</span>
                </span>
                <Icon
                    name="chevronRight"
                    size={16}
                    className="text-[var(--text-muted)] shrink-0 mt-1 group-hover:text-cyan-400 transition"
                />
            </Link>
        </section>
    );
}

type Suggestion = { icon: string; title: string; why: string; to: string };

function suggest({ dayClosed, openTasks, habits, doneToday }: Props): Suggestion | null {
    const inProgress = openTasks.find(t => t.status === 'doing');
    if (inProgress) {
        return {
            icon: 'target',
            title: inProgress.text,
            why: 'Уже начато — закончить проще, чем начать заново',
            to: '/plan/tasks',
        };
    }

    const urgent = openTasks.find(t => t.priority === 'high');
    if (urgent) {
        return {
            icon: 'flame',
            title: urgent.text,
            why: 'Самый высокий приоритет из открытых задач',
            to: '/plan/tasks',
        };
    }

    if (habits.length > 0 && doneToday < habits.length) {
        const remaining = habits.length - doneToday;
        return {
            icon: 'repeat',
            title: `Отметить привычки (${remaining})`,
            why: 'Короткий шаг, который держит серию',
            to: '/track/habits',
        };
    }

    if (openTasks.length > 0) {
        const first = openTasks[0];
        if (first) {
            return { icon: 'columns', title: first.text, why: 'Следующая в очереди', to: '/plan/tasks' };
        }
    }

    if (!dayClosed) {
        return {
            icon: 'moon',
            title: 'Закрыть день',
            why: 'Оценить сон, фокус и настроение — это данные для всех выводов',
            to: '/today/checkin',
        };
    }

    return {
        icon: 'check',
        title: 'На сегодня всё',
        why: 'Задачи закрыты, привычки отмечены, день оценён',
        to: '/insights/progress',
    };
}
