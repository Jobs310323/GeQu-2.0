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

// Labels are translation keys, not text. They are written out per item rather
// than derived from `id` so that grepping for a key finds the place it is used
// and `npm run check:i18n` can verify each one exists without knowing anything
// about this file.

export type NavItem = {
    /** Stable id, also the key used by hidden-tab preferences and legacy links. */
    id: string;
    icon: string;
    /** Translation key in the `nav` namespace. */
    labelKey: string;
    path: string;
    /** Shown in the command palette to disambiguate similar names. */
    hintKey?: string;
};

export type NavSection = {
    id: SectionId;
    titleKey: string;
    icon: string;
    /** Where the section itself opens. */
    path: string;
    items: NavItem[];
};

export const SECTIONS: NavSection[] = [
    {
        id: 'today', titleKey: 'nav:sections.today', icon: 'sun', path: '/',
        items: [
            { id: 'checkin', icon: 'moon', labelKey: 'nav:items.checkin.label', path: '/today/checkin', hintKey: 'nav:items.checkin.hint' },
            { id: 'aiplan', icon: 'sparkle', labelKey: 'nav:items.aiplan.label', path: '/today/plan', hintKey: 'nav:items.aiplan.hint' },
        ],
    },
    {
        id: 'plan', titleKey: 'nav:sections.plan', icon: 'target', path: '/plan/tasks',
        items: [
            { id: 'kanban', icon: 'columns', labelKey: 'nav:items.kanban.label', path: '/plan/tasks', hintKey: 'nav:items.kanban.hint' },
            { id: 'goals', icon: 'flag', labelKey: 'nav:items.goals.label', path: '/plan/goals', hintKey: 'nav:items.goals.hint' },
            { id: 'mindmap', icon: 'network', labelKey: 'nav:items.mindmap.label', path: '/plan/map', hintKey: 'nav:items.mindmap.hint' },
            { id: 'calendar', icon: 'calendar', labelKey: 'nav:items.calendar.label', path: '/plan/calendar' },
        ],
    },
    {
        id: 'track', titleKey: 'nav:sections.track', icon: 'repeat', path: '/track/habits',
        items: [
            { id: 'habits', icon: 'repeat', labelKey: 'nav:items.habits.label', path: '/track/habits' },
            { id: 'diary', icon: 'book', labelKey: 'nav:items.diary.label', path: '/track/journal' },
            { id: 'gym', icon: 'dumbbell', labelKey: 'nav:items.gym.label', path: '/track/body', hintKey: 'nav:items.gym.hint' },
            { id: 'snowman', icon: 'snowman', labelKey: 'nav:items.snowman.label', path: '/track/balance', hintKey: 'nav:items.snowman.hint' },
            { id: 'finance', icon: 'wallet', labelKey: 'nav:items.finance.label', path: '/track/finance' },
        ],
    },
    {
        id: 'insights', titleKey: 'nav:sections.insights', icon: 'chart', path: '/insights/progress',
        items: [
            { id: 'progress', icon: 'trophy', labelKey: 'nav:items.progress.label', path: '/insights/progress' },
            { id: 'hub', icon: 'chart', labelKey: 'nav:items.hub.label', path: '/insights/stats' },
        ],
    },
    {
        id: 'brain', titleKey: 'nav:sections.brain', icon: 'flask', path: '/brain/train',
        items: [
            { id: 'training', icon: 'target', labelKey: 'nav:items.training.label', path: '/brain/train', hintKey: 'nav:items.training.hint' },
            { id: 'clinical', icon: 'clipboard', labelKey: 'nav:items.clinical.label', path: '/brain/assess', hintKey: 'nav:items.clinical.hint' },
            { id: 'circles', icon: 'circle', labelKey: 'nav:items.circles.label', path: '/brain/reflect' },
            { id: 'knowledge', icon: 'library', labelKey: 'nav:items.knowledge.label', path: '/brain/learn' },
        ],
    },
    {
        id: 'profile', titleKey: 'nav:sections.profile', icon: 'idcard', path: '/profile',
        items: [
            { id: 'card', icon: 'idcard', labelKey: 'nav:items.card.label', path: '/profile' },
            { id: 'settings', icon: 'settings', labelKey: 'nav:items.settings.label', path: '/profile/settings' },
        ],
    },
];

/** The Today surface itself, which is the section root rather than an item. */
export const TODAY_ITEM: NavItem = { id: 'today', icon: 'sun', labelKey: 'nav:items.today.label', path: '/' };

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
    '/snowman': '/track/balance',
    '/finance': '/track/finance',
    '/progress': '/insights/progress',
    '/hub': '/insights/stats',
    '/training': '/brain/train',
    '/clinical': '/brain/assess',
    '/circles': '/brain/reflect',
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
