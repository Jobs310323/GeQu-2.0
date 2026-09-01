import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation('today');
    const suggestion = suggest({ dayClosed, openTasks, habits, doneToday });
    if (!suggestion) return null;

    const { title } = suggestion;
    // A suggestion's title is either the user's own task text, which is never
    // translated, or one of ours, which always is.
    const heading = 'text' in title ? title.text : t(title.key, { count: title.count });

    return (
        <section aria-labelledby="next-action">
            <h2 id="next-action" className="t-small font-medium text-[var(--gq-text-tertiary)] mb-3">
                {t('next.heading')}
            </h2>
            <Link
                to={suggestion.to}
                className="glass-card rounded-2xl p-5 flex items-start gap-4 hover:bg-white/5 transition group"
            >
                <span className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Icon name={suggestion.icon} size={20} />
                </span>
                <span className="flex-1 min-w-0">
                    <span className="block font-medium leading-snug">{heading}</span>
                    <span className="block t-small text-[var(--gq-text-tertiary)] mt-0.5">{t(suggestion.whyKey)}</span>
                </span>
                <Icon
                    name="chevronRight"
                    size={16}
                    className="text-[var(--gq-text-tertiary)] shrink-0 mt-1 group-hover:text-cyan-400 transition"
                />
            </Link>
        </section>
    );
}

/**
 * `suggest` stays free of translation so it can be unit-tested on its logic
 * alone: it decides *what* to suggest and returns keys, and the component
 * decides how that reads in the user's language.
 */
type Suggestion = {
    icon: string;
    /** Literal user text, or a key of ours to translate. */
    title: { text: string } | { key: string; count?: number };
    whyKey: string;
    to: string;
};

function suggest({ dayClosed, openTasks, habits, doneToday }: Props): Suggestion | null {
    const inProgress = openTasks.find(t => t.status === 'doing');
    if (inProgress) {
        return {
            icon: 'target',
            title: { text: inProgress.text },
            whyKey: 'next.why.started',
            to: '/plan/tasks',
        };
    }

    const urgent = openTasks.find(t => t.priority === 'high');
    if (urgent) {
        return {
            icon: 'flame',
            title: { text: urgent.text },
            whyKey: 'next.why.topPriority',
            to: '/plan/tasks',
        };
    }

    if (habits.length > 0 && doneToday < habits.length) {
        const remaining = habits.length - doneToday;
        return {
            icon: 'repeat',
            title: { key: 'next.habits', count: remaining },
            whyKey: 'next.why.habitStreak',
            to: '/track/habits',
        };
    }

    if (openTasks.length > 0) {
        const first = openTasks[0];
        if (first) {
            return { icon: 'columns', title: { text: first.text }, whyKey: 'next.why.queue', to: '/plan/tasks' };
        }
    }

    if (!dayClosed) {
        return {
            icon: 'moon',
            title: { key: 'next.closeDay' },
            whyKey: 'next.why.checkin',
            to: '/today/checkin',
        };
    }

    return {
        icon: 'check',
        title: { key: 'next.allDone' },
        whyKey: 'next.why.allDone',
        to: '/insights/progress',
    };
}
