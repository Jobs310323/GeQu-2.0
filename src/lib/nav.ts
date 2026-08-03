// Single source of truth for the navigation structure.
// The sidebar renders it; Settings lets the user hide entries from it.
//
// Two pages deliberately live outside these groups:
//   `dashboard` — reached by the sidebar's "Новая запись" button
//   `card`      — reached by clicking the level/energy block at the bottom
// They are still real pages, they just have their own entry points.

export type NavItem = { id: string; icon: string; label: string };
export type NavGroup = { id: string; title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'daily', title: 'Каждый день', items: [
            { id: 'aiplan', icon: '✨', label: 'ИИ-план дня' },
            { id: 'calendar', icon: '📅', label: 'Календарь' },
            { id: 'habits', icon: '♻️', label: 'Привычки' },
        ],
    },
    {
        id: 'tasks', title: 'Дела', items: [
            { id: 'kanban', icon: '📋', label: 'Канбан' },
            { id: 'goals', icon: '🚩', label: 'Цели' },
            { id: 'diary', icon: '📓', label: 'Дневник' },
        ],
    },
    {
        id: 'finance', title: 'Финансы', items: [
            { id: 'finance', icon: '💰', label: 'Финансы' },
        ],
    },
    {
        id: 'body', title: 'Тело и мозг', items: [
            { id: 'gym', icon: '🏋️', label: 'Зал' },
            { id: 'training', icon: '🎯', label: 'Тренировки' },
            { id: 'circles', icon: '⭕', label: 'Круги' },
            { id: 'clinical', icon: '📝', label: 'Тесты и КПТ' },
        ],
    },
    {
        id: 'analysis', title: 'Анализ', items: [
            { id: 'progress', icon: '🏆', label: 'Прогресс' },
            { id: 'hub', icon: '📊', label: 'Хаб' },
        ],
    },
    {
        id: 'help', title: 'Справка', items: [
            { id: 'knowledge', icon: '📚', label: 'База знаний' },
        ],
    },
];

/** Pages the user must never be able to hide, or they'd lock themselves out. */
export const LOCKED_TABS = new Set<string>();

/** Pages reachable outside the grouped nav — see the note at the top. */
export const STANDALONE_TABS: NavItem[] = [
    { id: 'dashboard', icon: '⬢', label: 'Новая запись' },
    { id: 'card', icon: '📇', label: 'Моя карточка' },
    { id: 'settings', icon: '⚙️', label: 'Настройки' },
];

export const ALL_TABS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

export function findTab(id: string) {
    return [...ALL_TABS, ...STANDALONE_TABS].find(t => t.id === id);
}
