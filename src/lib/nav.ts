// Single source of truth for the navigation structure.
// The sidebar renders it; Settings lets the user hide entries from it.
//
// Two pages deliberately live outside these groups:
//   `dashboard` — reached by the sidebar's "Новая запись" button
//   `card`      — reached by clicking the level/energy block at the bottom
// They are still real pages, they just have their own entry points.

export type NavItem = { id: string; icon: string; label: string; path: string };
export type NavGroup = { id: string; title: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'daily', title: 'Каждый день', items: [
            { id: 'aiplan', icon: '✨', label: 'ИИ-план дня', path: '/aiplan' },
            { id: 'calendar', icon: '📅', label: 'Календарь', path: '/calendar' },
            { id: 'habits', icon: '♻️', label: 'Привычки', path: '/habits' },
            { id: 'snowman', icon: '⛄', label: 'Снеговик', path: '/snowman' },
        ],
    },
    {
        id: 'tasks', title: 'Дела', items: [
            { id: 'kanban', icon: '📋', label: 'Канбан', path: '/kanban' },
            { id: 'goals', icon: '🚩', label: 'Цели', path: '/goals' },
            { id: 'mindmap', icon: '🧠', label: 'MindMap', path: '/mindmap' },
            { id: 'diary', icon: '📓', label: 'Дневник', path: '/diary' },
        ],
    },
    {
        id: 'finance', title: 'Финансы', items: [
            { id: 'finance', icon: '💰', label: 'Финансы', path: '/finance' },
        ],
    },
    {
        id: 'body', title: 'Тело и мозг', items: [
            { id: 'gym', icon: '🏋️', label: 'Зал', path: '/gym' },
            { id: 'training', icon: '🎯', label: 'Тренажёры', path: '/training' },
            { id: 'circles', icon: '⭕', label: 'Круги', path: '/circles' },
            { id: 'clinical', icon: '📝', label: 'Тесты и КПТ', path: '/clinical' },
        ],
    },
    {
        id: 'analysis', title: 'Анализ', items: [
            { id: 'progress', icon: '🏆', label: 'Прогресс', path: '/progress' },
            { id: 'hub', icon: '📊', label: 'Хаб', path: '/hub' },
        ],
    },
    {
        id: 'help', title: 'Справка', items: [
            { id: 'knowledge', icon: '📚', label: 'База знаний', path: '/knowledge' },
        ],
    },
];

/** Pages the user must never be able to hide, or they'd lock themselves out. */
export const LOCKED_TABS = new Set<string>();

/** Pages reachable outside the grouped nav — see the note at the top. */
export const STANDALONE_TABS: NavItem[] = [
    { id: 'dashboard', icon: '⬢', label: 'Новая запись', path: '/dashboard' },
    { id: 'card', icon: '📇', label: 'Моя карточка', path: '/card' },
    { id: 'settings', icon: '⚙️', label: 'Настройки', path: '/settings' },
];

export const ALL_TABS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);

export function findTab(id: string) {
    return [...ALL_TABS, ...STANDALONE_TABS].find(t => t.id === id);
}

/** The nav entry a URL belongs to. `/` is the dashboard, which has no group. */
export function findByPath(pathname: string) {
    const path = pathname === '/' ? '/dashboard' : pathname.replace(/\/+$/, '') || '/dashboard';
    return [...ALL_TABS, ...STANDALONE_TABS].find(t => t.path === path);
}
