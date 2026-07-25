// Single source of truth for the navigation structure.
// The sidebar renders it; Settings lets the user hide entries from it.

export type NavItem = { id: string; icon: string; label: string };
export type NavGroup = { id: string; title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'me', title: 'Обо мне', items: [
            { id: 'card', icon: '📇', label: 'Моя карточка' },
        ],
    },
    {
        id: 'daily', title: 'Каждый день', items: [
            { id: 'dashboard', icon: '⬢', label: 'Дашборд' },
            { id: 'aiplan', icon: '✨', label: 'ИИ-план дня' },
            { id: 'calendar', icon: '📅', label: 'Календарь' },
            { id: 'diary', icon: '📓', label: 'Дневник' },
            { id: 'notes', icon: '📌', label: 'Записки' },
            { id: 'habits', icon: '♻️', label: 'Привычки' },
        ],
    },
    {
        id: 'tasks', title: 'Дела', items: [
            { id: 'kanban', icon: '📋', label: 'Канбан' },
            { id: 'goals', icon: '🚩', label: 'Цели' },
        ],
    },
    {
        id: 'body', title: 'Тело и мозг', items: [
            { id: 'gym', icon: '🏋️', label: 'Зал' },
            { id: 'training', icon: '🎯', label: 'Тренировки' },
            { id: 'circles', icon: '⭕', label: 'Круги' },
            { id: 'cbt', icon: '💭', label: 'КПТ-практика' },
            { id: 'clinical', icon: '📝', label: 'Клинические тесты' },
        ],
    },
    {
        id: 'analysis', title: 'Анализ', items: [
            { id: 'progress', icon: '🏆', label: 'Прогресс' },
            { id: 'dynamics', icon: '📈', label: 'Динамика' },
            { id: 'hub', icon: '📊', label: 'Хаб' },
        ],
    },
    {
        id: 'help', title: 'Справка', items: [
            { id: 'knowledge', icon: '📚', label: 'База знаний' },
            { id: 'about', icon: 'ℹ️', label: 'Про СДВГ' },
            { id: 'settings', icon: '⚙️', label: 'Настройки' },
        ],
    },
];

/** Pages the user must never be able to hide, or they'd lock themselves out. */
export const LOCKED_TABS = new Set(['settings', 'dashboard']);

export const ALL_TABS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

export function findTab(id: string) {
    return ALL_TABS.find(t => t.id === id);
}
