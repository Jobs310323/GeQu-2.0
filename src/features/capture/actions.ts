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

export type PaletteAction = {
    id: string;
    label: string;
    hint?: string;
    icon: string;
    group: 'Создать' | 'Перейти';
    /** Receives the text typed after the command word, when there is any. */
    run: (input: string, navigate: NavigateFunction) => void;
};

/** Actions that turn the query itself into a record. */
export const CAPTURE_ACTIONS: PaletteAction[] = [
    {
        id: 'task',
        label: 'Новая задача',
        hint: 'Добавить в канбан',
        icon: 'columns',
        group: 'Создать',
        run: (input, navigate) => {
            const text = input.trim();
            if (!text) { navigate('/plan/tasks'); return; }
            useTasks.getState().addTask({ id: Date.now(), text, status: 'todo', priority: 'medium' });
            navigate('/plan/tasks');
        },
    },
    {
        id: 'habit',
        label: 'Новая привычка',
        hint: 'Отмечать каждый день',
        icon: 'repeat',
        group: 'Создать',
        run: (input, navigate) => {
            const name = input.trim();
            if (name) useHabits.getState().add(name);
            navigate('/track/habits');
        },
    },
    {
        id: 'journal',
        label: 'Запись в дневник',
        hint: 'Мысль или наблюдение',
        icon: 'book',
        group: 'Создать',
        run: (input, navigate) => {
            const content = input.trim();
            if (content) useJournal.getState().add(content);
            navigate('/track/journal');
        },
    },
    {
        id: 'expense',
        label: 'Расход',
        hint: 'Сумма — например, 450',
        icon: 'wallet',
        group: 'Создать',
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
        label: 'Закрыть день',
        hint: 'Сон, фокус, настроение',
        icon: 'moon',
        group: 'Создать',
        run: (_input, navigate) => navigate('/today/checkin'),
    },
    {
        id: 'workout',
        label: 'Тренировка',
        hint: 'Начать сессию в зале',
        icon: 'dumbbell',
        group: 'Создать',
        run: (_input, navigate) => navigate('/track/body'),
    },
];

/** One action per destination, derived from the nav so the two cannot diverge. */
export const NAVIGATION_ACTIONS: PaletteAction[] = ALL_ITEMS.map(item => ({
    id: `go-${item.id}`,
    label: item.label,
    ...(item.hint ? { hint: item.hint } : {}),
    icon: item.icon,
    group: 'Перейти' as const,
    run: (_input, navigate) => navigate(item.path),
}));

export const ALL_ACTIONS: PaletteAction[] = [...CAPTURE_ACTIONS, ...NAVIGATION_ACTIONS];

/** The section each navigation action belongs to, for the palette's subtitles. */
export const SECTION_OF: Record<string, string> = Object.fromEntries(
    SECTIONS.flatMap(s => s.items.map(i => [`go-${i.id}`, s.title])),
);
