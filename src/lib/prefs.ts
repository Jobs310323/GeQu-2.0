// User interface preferences: which tabs are visible, which sidebar groups are
// collapsed, and which dashboard widgets are shown.
//
// Everything is stored as an explicit "hidden" / "collapsed" list, so anything
// added to the app later shows up by default instead of silently disappearing.

import { DB } from './db';

export const DASHBOARD_WIDGETS = [
    { id: 'overview', label: 'Обзор дня (метрики и шкалы)', icon: '⬢' },
    { id: 'today', label: 'Сегодня: привычки и задачи', icon: '✅' },
    { id: 'hyperfocus', label: 'Кнопка гиперфокуса', icon: '🚀' },
    { id: 'streak', label: 'Серия и ачивки', icon: '🔥' },
    { id: 'ratings', label: 'Оценка дня (сон/фокус/настроение)', icon: '📊' },
    { id: 'bodyscan', label: 'Сканирование тела', icon: '🔎' },
    { id: 'tags', label: 'Что помогло / что мешало', icon: '🏷️' },
    { id: 'mainEvent', label: 'Главное событие дня', icon: '📝' },
    { id: 'testTomorrow', label: 'Что проверить завтра', icon: '🔬' },
    { id: 'gratitude', label: 'Благодарность', icon: '💖' },
    { id: 'customQuestion', label: 'Свой вопрос', icon: '❓' },
] as const;

export type Prefs = {
    hiddenTabs: string[];
    collapsedGroups: string[];
    hiddenWidgets: string[];
};

const DEFAULTS: Prefs = { hiddenTabs: [], collapsedGroups: [], hiddenWidgets: [] };

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
    };
}

export function savePrefs(p: Prefs) {
    DB.save('prefs', p);
}

/** Adds or removes `id` from a list — used by every toggle in the UI. */
export function toggleIn(list: string[], id: string): string[] {
    return list.includes(id) ? list.filter(x => x !== id) : [...list, id];
}
