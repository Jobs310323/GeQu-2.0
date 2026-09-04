import { hydrate } from './persist';
import { loadPrefs } from '../lib/prefs';
import { useAppUi } from './app-ui.store';
import { useBody } from './body.store';
import { useCalendar } from './calendar.store';
import { useCheckins } from './checkins.store';
import { useCognitive } from './cognitive.store';
import { useFinance } from './finance.store';
import { useHabits } from './habits.store';
import { useJournal } from './journal.store';
import { useTasks } from './tasks.store';

import type { DayLog, Habit, DiaryEntry, Reminder, TestResult, ClinicalResult, CbtRecord, GymData, KanbanTask, UnlockedAchievements } from '../types/domain';
import type { Goal } from '../types/goals';
import type { FinanceData } from '../features/finance/types';
import type { Theme } from './app-ui.store';

/**
 * Re-reads every store from localStorage.
 *
 * Called after cloud sync writes a merged snapshot. Each store built its initial
 * state from localStorage when the module was first imported, which happened
 * long before the network round-trip resolved — so without this the user would
 * be looking at pre-sync data until something forced a re-read.
 *
 * That "something" used to be `window.location.reload()`. It worked, but it
 * threw away every piece of unsaved screen state, scrolled the user back to the
 * top, and flashed the whole app. It existed because state lived in
 * `useState(DB.get(...))` inside components, which nothing could reach from
 * outside. Since Phase 3 the state lives in stores with a `setState`, so the
 * merge can simply be pushed into them.
 *
 * This file has to name every persisted slice, and that is a genuine
 * maintenance cost — a new slice added to a store and forgotten here would
 * silently not refresh after a sync. `rehydrate.test.ts` guards it by comparing
 * this list against the keys the stores actually persist.
 */
export function rehydrateStores(): void {
    useTasks.setState({
        kanban: hydrate<KanbanTask[]>('kanban', []),
        goals: hydrate<Goal[]>('goals', []),
    });

    useCheckins.setState({ logs: hydrate<DayLog[]>('logs', []) });
    useHabits.setState({ habits: hydrate<Habit[]>('habits', []) });
    useJournal.setState({ entries: hydrate<DiaryEntry[]>('diary', []) });
    useCalendar.setState({ reminders: hydrate<Reminder[]>('reminders', []) });

    useCognitive.setState({
        results: hydrate<TestResult[]>('tests', []),
        achievements: hydrate<UnlockedAchievements>('ach', []),
        clinical: hydrate<ClinicalResult[]>('clinical', []),
        cbt: hydrate<CbtRecord[]>('cbt', []),
    });

    useBody.setState({
        gym: hydrate<GymData>('gym', useBody.getState().gym),
    });

    useFinance.setState({ finance: hydrate<FinanceData>('finance', useFinance.getState().finance) });

    useAppUi.setState({
        theme: hydrate<Theme>('theme', 'dark'),
        dopamineMenu: hydrate<string[]>('dopamineMenu', []),
        // Prefs have their own reader because `savePrefs` normalises on write.
        prefs: loadPrefs(),
    });
}

/**
 * The `gequ_*` keys this module re-reads. Exported so a test can check it
 * against what the stores actually persist — see the maintenance note above.
 */
export const REHYDRATED_KEYS = [
    'kanban', 'goals', 'logs', 'habits', 'diary', 'reminders',
    'tests', 'ach', 'clinical', 'cbt',
    'gym', 'finance',
    'theme', 'dopamineMenu', 'prefs',
] as const;
