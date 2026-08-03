export type NavItem = { id: string; label: string; icon: string };
export type NavGroup = { id: string; title: string; items: NavItem[] };

// icon = key into <Icon name=.../> — see components/Icons.tsx
export const NAV_GROUPS: NavGroup[] = [
    {
        id: 'main', title: 'Основное', items: [
            { id: 'dashboard', label: 'Дашборд', icon: 'grid' },
            { id: 'calendar', label: 'Календарь', icon: 'calendar' },
            { id: 'habits', label: 'Привычки', icon: 'repeat' },
        ],
    },
    {
        id: 'mind', title: 'Дела и разум', items: [
            { id: 'kanban', label: 'Канбан', icon: 'columns' },
            { id: 'goals', label: 'Цели', icon: 'flag' },
            { id: 'diary', label: 'Дневник', icon: 'book' },
            { id: 'notes', label: 'Записки', icon: 'pin' },
            { id: 'cbt', label: 'КПТ-практика', icon: 'thought' },
            { id: 'clinical', label: 'Клинические тесты', icon: 'clipboard' },
        ],
    },
    {
        id: 'body', title: 'Тело и финансы', items: [
            { id: 'gym', label: 'Зал и тренировки', icon: 'dumbbell' },
            { id: 'finance', label: 'Финансы', icon: 'wallet' },
        ],
    },
    {
        id: 'analysis', title: 'Анализ', items: [
            { id: 'progress', label: 'Прогресс', icon: 'trophy' },
            { id: 'dynamics', label: 'Динамика', icon: 'chart' },
        ],
    },
];

export const BOTTOM_ITEMS: NavItem[] = [
    { id: 'settings', label: 'Настройки', icon: 'settings' },
];

export const ALL_TABS: NavItem[] = [...NAV_GROUPS.flatMap(g => g.items), ...BOTTOM_ITEMS];

export function findTab(id: string) {
    return ALL_TABS.find(t => t.id === id);
}
