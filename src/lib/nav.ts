// The navigation structure — one source of truth for the sidebar, the mobile
// bottom bar, the command palette and the router.
//
// The six sections are the product's information architecture: they follow the
// user's question, not the app's feature list.
//
//   TODAY     what now
//   PLAN      what next
//   TRACK     what is happening
//   INSIGHTS  what it means
//   BRAIN     how my thinking is doing
//   PROFILE   who this is about
//
// Every screen sits under exactly one of them. Nothing was removed in the
// re-parenting — the previous nineteen destinations are all still here, they
// just stopped competing with each other at the top level.

export type SectionId = 'today' | 'plan' | 'track' | 'insights' | 'brain' | 'profile';

export type NavItem = {
    /** Stable id, also the key used by hidden-tab preferences and legacy links. */
    id: string;
    icon: string;
    label: string;
    path: string;
    /** Shown in the command palette to disambiguate similar names. */
    hint?: string;
};

export type NavSection = {
    id: SectionId;
    title: string;
    icon: string;
    /** Where the section itself opens. */
    path: string;
    items: NavItem[];
};

export const SECTIONS: NavSection[] = [
    {
        id: 'today', title: 'Сегодня', icon: 'sun', path: '/',
        items: [
            { id: 'checkin', icon: 'moon', label: 'Закрыть день', path: '/today/checkin', hint: 'Сон, фокус, настроение' },
            { id: 'aiplan', icon: 'sparkle', label: 'План дня', path: '/today/plan', hint: 'ИИ собирает расписание' },
        ],
    },
    {
        id: 'plan', title: 'Планы', icon: 'target', path: '/plan/tasks',
        items: [
            { id: 'kanban', icon: 'columns', label: 'Задачи', path: '/plan/tasks', hint: 'Канбан-доска' },
            { id: 'goals', icon: 'flag', label: 'Цели', path: '/plan/goals', hint: 'Цели и шаги' },
            { id: 'mindmap', icon: 'network', label: 'Карта мыслей', path: '/plan/map', hint: 'MindMap' },
            { id: 'calendar', icon: 'calendar', label: 'Календарь', path: '/plan/calendar' },
        ],
    },
    {
        id: 'track', title: 'Дневники', icon: 'repeat', path: '/track/habits',
        items: [
            { id: 'habits', icon: 'repeat', label: 'Привычки', path: '/track/habits' },
            { id: 'diary', icon: 'book', label: 'Дневник', path: '/track/journal' },
            { id: 'gym', icon: 'dumbbell', label: 'Тело', path: '/track/body', hint: 'Тренировки и программы' },
            { id: 'finance', icon: 'wallet', label: 'Деньги', path: '/track/finance' },
        ],
    },
    {
        id: 'insights', title: 'Выводы', icon: 'chart', path: '/insights/progress',
        items: [
            { id: 'progress', icon: 'trophy', label: 'Прогресс', path: '/insights/progress' },
            { id: 'hub', icon: 'chart', label: 'Статистика', path: '/insights/stats' },
        ],
    },
    {
        id: 'brain', title: 'Мозг', icon: 'flask', path: '/brain/train',
        items: [
            { id: 'training', icon: 'target', label: 'Тренажёры', path: '/brain/train', hint: 'Короткие упражнения' },
            { id: 'clinical', icon: 'clipboard', label: 'Опросники', path: '/brain/assess', hint: 'Скрининг и КПТ' },
            { id: 'knowledge', icon: 'library', label: 'База знаний', path: '/brain/learn' },
        ],
    },
    {
        id: 'profile', title: 'Профиль', icon: 'idcard', path: '/profile',
        items: [
            { id: 'card', icon: 'idcard', label: 'Моя карточка', path: '/profile' },
            { id: 'settings', icon: 'settings', label: 'Настройки', path: '/profile/settings' },
        ],
    },
];

/** The Today surface itself, which is the section root rather than an item. */
export const TODAY_ITEM: NavItem = { id: 'today', icon: 'sun', label: 'Сегодня', path: '/' };

export const ALL_ITEMS: NavItem[] = [TODAY_ITEM, ...SECTIONS.flatMap(s => s.items)];

/**
 * Where each pre-2.0 path now lives.
 *
 * Bookmarks, the PWA start URL and anything the knowledge base links to must
 * keep working, so the router redirects every one of these rather than 404ing.
 */
export const LEGACY_PATHS: Record<string, string> = {
    '/dashboard': '/today/checkin',
    '/aiplan': '/today/plan',
    '/kanban': '/plan/tasks',
    '/goals': '/plan/goals',
    '/mindmap': '/plan/map',
    '/calendar': '/plan/calendar',
    '/habits': '/track/habits',
    '/diary': '/track/journal',
    '/gym': '/track/body',
    '/finance': '/track/finance',
    '/progress': '/insights/progress',
    '/hub': '/insights/stats',
    '/training': '/brain/train',
    '/clinical': '/brain/assess',
    '/knowledge': '/brain/learn',
    '/card': '/profile',
    '/settings': '/profile/settings',
};

/** Screens the user must never be able to hide, or they would lock themselves out. */
export const LOCKED_IDS = new Set(['today', 'checkin', 'settings', 'card']);

/** Ids that changed in the 2.0 re-parenting, so older references still resolve. */
const ID_ALIASES: Record<string, string> = { dashboard: 'checkin' };

export function findById(id: string): NavItem | undefined {
    const resolved = ID_ALIASES[id] ?? id;
    return ALL_ITEMS.find(i => i.id === resolved);
}

export function findByPath(pathname: string): NavItem | undefined {
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '') || '/';
    return ALL_ITEMS.find(i => i.path === path);
}

/** The section a URL belongs to — drives which nav group is highlighted. */
export function sectionForPath(pathname: string): NavSection | undefined {
    if (pathname === '/' || pathname.startsWith('/today')) return SECTIONS[0];
    return SECTIONS.find(s => s.items.some(i => pathname.startsWith(i.path)));
}
