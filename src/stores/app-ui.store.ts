import { create } from 'zustand';
import { loadPrefs, savePrefs, type Prefs } from '../lib/prefs';
import type { HyperfocusSession } from '../types/domain';
import { hydrate, persistSlices } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Application-level UI state: things that must survive navigation but are not
// user data. Screen-local state (open modals, in-progress forms, hover,
// selection, tab index) stays in the component -- putting it here is exactly
// how a store turns into a global bag of everything.

export type Theme = 'dark' | 'light';

export type Pomodoro = {
    workTime: number;
    mode: 'work' | 'break';
    timeLeft: number;
    isRunning: boolean;
};

const DEFAULT_DOPAMINE_MENU = [
    'Попить воды', 'Сделать растяжку', 'Посмотреть в окно 2 мин', 'Поиграть с котом', 'Закрыть глаза на 1 мин',
];

const INITIAL_POMODORO: Pomodoro = { workTime: 25, mode: 'work', timeLeft: 25 * 60, isRunning: false };

type AppUiState = {
    theme: Theme;
    prefs: Prefs;
    dopamineMenu: string[];

    /** Persisted so a running timer survives navigation, not so it survives a reload. */
    pomodoro: Pomodoro;
    /** Ephemeral: an interrupted focus session is not a record. */
    hyperfocus: HyperfocusSession | null;
    rouletteOpen: boolean;

    setTheme: Setter<Theme>;
    toggleTheme: () => void;
    setPrefs: Setter<Prefs>;
    setDopamineMenu: Setter<string[]>;
    setPomodoro: Setter<Pomodoro>;
    setHyperfocus: Setter<HyperfocusSession | null>;
    setRouletteOpen: (open: boolean) => void;
};

export const useAppUi = create<AppUiState>()((set, get) => ({
    theme: hydrate<Theme>('theme', 'dark'),
    prefs: loadPrefs(),
    dopamineMenu: hydrate<string[]>('dopamineMenu', DEFAULT_DOPAMINE_MENU),
    pomodoro: INITIAL_POMODORO,
    hyperfocus: null,
    rouletteOpen: false,

    setTheme: next => set(s => ({ theme: resolve(next, s.theme) })),
    toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
    setPrefs: next => set(s => ({ prefs: resolve(next, s.prefs) })),
    setDopamineMenu: next => set(s => ({ dopamineMenu: resolve(next, s.dopamineMenu) })),
    setPomodoro: next => set(s => ({ pomodoro: resolve(next, s.pomodoro) })),
    setHyperfocus: next => set(s => ({ hyperfocus: resolve(next, s.hyperfocus) })),
    setRouletteOpen: rouletteOpen => set({ rouletteOpen }),
}));

persistSlices(useAppUi, {
    theme: s => s.theme,
    dopamineMenu: s => s.dopamineMenu,
});

// Prefs keep their own writer because `savePrefs` normalises before storing.
useAppUi.subscribe((state, prev) => {
    if (state.prefs !== prev.prefs) savePrefs(state.prefs);
});

export const selectTheme = (s: AppUiState) => s.theme;
export const selectPrefs = (s: AppUiState) => s.prefs;
