// User interface preferences: which tabs are visible, which sidebar groups are
// collapsed, and which dashboard widgets are shown.
//
// Everything is stored as an explicit "hidden" / "collapsed" list, so anything
// added to the app later shows up by default instead of silently disappearing.

import { DB } from './db';

// The widget's `id` is a stored value — `prefs.hiddenWidgets` holds it — so it
// stays an identifier and the label is a key beside it.
export const DASHBOARD_WIDGETS = [
    { id: 'overview', labelKey: 'profile:settings.widget.overview', icon: '⬢' },
    { id: 'today', labelKey: 'profile:settings.widget.today', icon: '✅' },
    { id: 'hyperfocus', labelKey: 'profile:settings.widget.hyperfocus', icon: '🚀' },
    { id: 'streak', labelKey: 'profile:settings.widget.streak', icon: '🔥' },
    { id: 'ratings', labelKey: 'profile:settings.widget.ratings', icon: '📊' },
    { id: 'bodyscan', labelKey: 'profile:settings.widget.bodyscan', icon: '🔎' },
    { id: 'tags', labelKey: 'profile:settings.widget.tags', icon: '🏷️' },
    { id: 'mainEvent', labelKey: 'profile:settings.widget.mainEvent', icon: '📝' },
    { id: 'testTomorrow', labelKey: 'profile:settings.widget.testTomorrow', icon: '🔬' },
    { id: 'gratitude', labelKey: 'profile:settings.widget.gratitude', icon: '💖' },
    { id: 'customQuestion', labelKey: 'profile:settings.widget.customQuestion', icon: '❓' },
] as const;

export type Prefs = {
    hiddenTabs: string[];
    collapsedGroups: string[];
    hiddenWidgets: string[];
    /**
     * ISO-4217 code for how money is displayed.
     *
     * Separate from the interface language on purpose: a Russian speaker in
     * Berlin spends euros, and an English speaker in Moscow spends roubles.
     * Deriving one from the other gets both wrong for anyone who has moved.
     */
    currency: string;
};

const DEFAULTS: Prefs = {
    hiddenTabs: [], collapsedGroups: [], hiddenWidgets: [],
    // RUB, not a guess from the browser: every stored amount in every existing
    // install was entered as roubles and displayed with a hardcoded `₽`.
    // Re-labelling those numbers as dollars would misstate the user's own data.
    currency: 'RUB',
};

export function loadPrefs(): Prefs {
    // Read as Partial: a stored copy written by an older build can be missing
    // any of these lists, and each one is normalised rather than trusted.
    const raw = DB.get<Partial<Prefs> | null>('prefs', null);
    if (!raw || typeof raw !== 'object') return { ...DEFAULTS };
    const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
    return {
        hiddenTabs: arr(raw.hiddenTabs),
        collapsedGroups: arr(raw.collapsedGroups),
        hiddenWidgets: arr(raw.hiddenWidgets),
        currency: typeof raw.currency === 'string' && /^[A-Z]{3}$/.test(raw.currency)
            ? raw.currency
            : DEFAULTS.currency,
    };
}

export function savePrefs(p: Prefs) {
    DB.save('prefs', p);
}

/** Adds or removes `id` from a list — used by every toggle in the UI. */
export function toggleIn(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}
