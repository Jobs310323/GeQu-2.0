import type { NavigateFunction } from 'react-router';
import { ALL_ITEMS, SECTIONS } from '../../lib/nav';
import { useTasks } from '../../stores/tasks.store';
import { useHabits } from '../../stores/habits.store';
import { useJournal } from '../../stores/journal.store';
import { useFinance } from '../../stores/finance.store';
import { nowInstant } from '../../lib/datetime';

// What the palette can do.
//
// Capture actions take the text the user already typed, so a thought becomes a
// record in one gesture. Navigation actions are generated from the nav
// structure, so a new screen is reachable from the palette the moment it exists
// — there is no second list to keep in sync.

// `group` is an id, not a heading. It used to be the Russian word shown in the
// UI, which the palette then compared against with `group === 'Создать'` — a
// display string doing load-bearing work, so translating the heading would
// have silently disabled the capture path.
export type PaletteGroup = 'create' | 'goto';

export type PaletteAction = {
    id: string;
    /** Translation key for the row's title. */
    labelKey: string;
    /** Translation key for the row's subtitle. */
    hintKey?: string;
    icon: string;
    group: PaletteGroup;
    /** Receives the text typed after the command word, when there is any. */
    run: (input: string, navigate: NavigateFunction) => void;
};

/** Actions that turn the query itself into a record. */
export const CAPTURE_ACTIONS: PaletteAction[] = [
    {
        id: 'task',
        labelKey: 'capture:actions.task.label',
        hintKey: 'capture:actions.task.hint',
        icon: 'columns',
        group: 'create',
        run: (input, navigate) => {
            const text = input.trim();
            if (!text) { navigate('/plan/tasks'); return; }
            useTasks.getState().addTask({ id: Date.now(), text, status: 'todo', priority: 'medium' });
            navigate('/plan/tasks');
        },
    },
    {
        id: 'habit',
        labelKey: 'capture:actions.habit.label',
        hintKey: 'capture:actions.habit.hint',
        icon: 'repeat',
        group: 'create',
        run: (input, navigate) => {
            const name = input.trim();
            if (name) useHabits.getState().add(name);
            navigate('/track/habits');
        },
    },
    {
        id: 'journal',
        labelKey: 'capture:actions.journal.label',
        hintKey: 'capture:actions.journal.hint',
        icon: 'book',
        group: 'create',
        run: (input, navigate) => {
            const content = input.trim();
            if (content) useJournal.getState().add(content);
            navigate('/track/journal');
        },
    },
    {
        id: 'expense',
        labelKey: 'capture:actions.expense.label',
        hintKey: 'capture:actions.expense.hint',
        icon: 'wallet',
        group: 'create',
        run: (input, navigate) => {
            const amount = Number(input.replace(',', '.').replace(/[^\d.]/g, ''));
            if (Number.isFinite(amount) && amount > 0) {
                const { finance, setFinance } = useFinance.getState();
                setFinance({
                    ...finance,
                    entries: [
                        // Uncategorised on purpose: the point of quick capture is
                        // that the number is recorded before it is forgotten.
                        // Categorising it is a later, calmer decision.
                        { id: Date.now(), type: 'expense', categoryId: 'other_e', amount, date: nowInstant() },
                        ...finance.entries,
                    ],
                });
            }
            navigate('/track/finance');
        },
    },
    {
        id: 'checkin',
        labelKey: 'capture:actions.checkin.label',
        hintKey: 'capture:actions.checkin.hint',
        icon: 'moon',
        group: 'create',
        run: (_input, navigate) => navigate('/today/checkin'),
    },
    {
        id: 'workout',
        labelKey: 'capture:actions.workout.label',
        hintKey: 'capture:actions.workout.hint',
        icon: 'dumbbell',
        group: 'create',
        run: (_input, navigate) => navigate('/track/body'),
    },
];

/** One action per destination, derived from the nav so the two cannot diverge. */
export const NAVIGATION_ACTIONS: PaletteAction[] = ALL_ITEMS.map(item => ({
    id: `go-${item.id}`,
    labelKey: item.labelKey,
    ...(item.hintKey ? { hintKey: item.hintKey } : {}),
    icon: item.icon,
    group: 'goto' as const,
    run: (_input, navigate) => navigate(item.path),
}));

export const ALL_ACTIONS: PaletteAction[] = [...CAPTURE_ACTIONS, ...NAVIGATION_ACTIONS];

/** The section each navigation action belongs to, for the palette's subtitles. */
export const SECTION_OF: Record<string, string> = Object.fromEntries(
    SECTIONS.flatMap(s => s.items.map(i => [`go-${i.id}`, s.titleKey])),
);
