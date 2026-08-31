import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { DB } from '../lib/db';
import { loadPrefs, savePrefs, type Prefs } from '../lib/prefs';
import { DEFAULT_FINANCE, type FinanceData } from '../features/finance/types';
import type { ActivityLabel, DayRecord } from '../features/snowman/types';
import type {
    DayLog, DiaryEntry, Habit, KanbanTask, TestResult, ClinicalResult, CbtRecord,
    CircleItem, Reminder, GymData, UnlockedAchievements, HyperfocusSession,
} from '../types/domain';
import { EMPTY_GYM_DATA } from '../types/domain';
import type { Goal } from '../types/goals';
import { computeXp, levelFromXp } from '../lib/xp';
import { todayKey, toLocalDateKey } from '../lib/datetime';

// ---------------------------------------------------------------------------
// TRANSITIONAL. This provider holds exactly the state that used to live in
// GequApp, moved out so the router can render pages without threading 13 props
// through the tree. It is deliberately a faithful move, not a redesign: the
// shapes, the defaults and the persistence effects are unchanged, so this
// commit changes where state lives and nothing about what it does.
//
// Phase 3 replaces the internals with per-domain Zustand stores. Route
// components consume this through `useAppState()`, so that swap happens here
// and in the route adapters, not across every page.
// ---------------------------------------------------------------------------

const DEFAULT_DOPAMINE_MENU = [
    'Попить воды', 'Сделать растяжку', 'Посмотреть в окно 2 мин', 'Поиграть с котом', 'Закрыть глаза на 1 мин',
];

export type Theme = 'dark' | 'light';

export type Pomodoro = {
    workTime: number;
    mode: 'work' | 'break';
    timeLeft: number;
    isRunning: boolean;
};

export type AppState = ReturnType<typeof useAppStateValue>;

const AppStateContext = createContext<AppState | null>(null);

function useAppStateValue() {
    const [dopamineMenu, setDopamineMenu] = useState<string[]>(DB.get('dopamineMenu', DEFAULT_DOPAMINE_MENU));
    const [logs, setLogs] = useState<DayLog[]>(DB.get<DayLog[]>('logs', []));
    const [diary, setDiary] = useState<DiaryEntry[]>(DB.get<DiaryEntry[]>('diary', []));
    const [goals, setGoals] = useState<Goal[]>(DB.get<Goal[]>('goals', []));
    const [habits, setHabits] = useState<Habit[]>(DB.get<Habit[]>('habits', []));
    const [kanban, setKanban] = useState<KanbanTask[]>(DB.get<KanbanTask[]>('kanban', []));
    const [testResults, setTestResults] = useState<TestResult[]>(DB.get<TestResult[]>('tests', []));
    const [achievements, setAchievements] = useState<UnlockedAchievements>(DB.get<UnlockedAchievements>('ach', []));
    const [theme, setTheme] = useState<Theme>(DB.get<Theme>('theme', 'dark'));
    const [gymData, setGymData] = useState<GymData>(DB.get<GymData>('gym', EMPTY_GYM_DATA));
    const [circles, setCircles] = useState<CircleItem[]>(DB.get<CircleItem[]>('circles', []));
    const [reminders, setReminders] = useState<Reminder[]>(DB.get<Reminder[]>('reminders', []));
    const [clinicalResults, setClinicalResults] = useState<ClinicalResult[]>(DB.get<ClinicalResult[]>('clinical', []));
    const [cbtRecords, setCbtRecords] = useState<CbtRecord[]>(DB.get<CbtRecord[]>('cbt', []));
    const [finance, setFinance] = useState<FinanceData>(DB.get<FinanceData>('finance', DEFAULT_FINANCE));
    const [snowmanLabels, setSnowmanLabels] = useState<ActivityLabel[]>(DB.get<ActivityLabel[]>('snowmanLabels', []));
    const [snowmanDays, setSnowmanDays] = useState<DayRecord[]>(DB.get<DayRecord[]>('snowmanDays', []));
    const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

    // Ephemeral, never persisted.
    const [hyperfocus, setHyperfocus] = useState<HyperfocusSession | null>(null);
    const [rouletteOpen, setRouletteOpen] = useState(false);

    // Lives above the routes (not inside the Pomodoro tab) so navigating away
    // never pauses or resets a running timer.
    const [pomodoro, setPomodoro] = useState<Pomodoro>({
        workTime: 25, mode: 'work', timeLeft: 25 * 60, isRunning: false,
    });

    const goalsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (!pomodoro.isRunning) return;
        const id = setInterval(() => {
            setPomodoro(p => {
                if (p.timeLeft <= 1) {
                    const nextMode = p.mode === 'work' ? 'break' : 'work';
                    return { ...p, mode: nextMode, timeLeft: nextMode === 'work' ? p.workTime * 60 : 5 * 60, isRunning: false };
                }
                return { ...p, timeLeft: p.timeLeft - 1 };
            });
        }, 1000);
        return () => clearInterval(id);
    }, [pomodoro.isRunning]);

    useEffect(() => { savePrefs(prefs); }, [prefs]);
    useEffect(() => { DB.save('circles', circles); }, [circles]);
    useEffect(() => { DB.save('reminders', reminders); }, [reminders]);
    useEffect(() => { DB.save('clinical', clinicalResults); }, [clinicalResults]);
    useEffect(() => { DB.save('cbt', cbtRecords); }, [cbtRecords]);
    useEffect(() => { DB.save('logs', logs); }, [logs]);
    useEffect(() => { DB.save('dopamineMenu', dopamineMenu); }, [dopamineMenu]);
    useEffect(() => { DB.save('diary', diary); }, [diary]);
    useEffect(() => {
        // Goals are edited character by character in a rich text field; without
        // the debounce every keystroke would serialise the whole tree.
        if (goalsSaveTimer.current) clearTimeout(goalsSaveTimer.current);
        goalsSaveTimer.current = setTimeout(() => DB.save('goals', goals), 500);
        return () => { if (goalsSaveTimer.current) clearTimeout(goalsSaveTimer.current); };
    }, [goals]);
    useEffect(() => { DB.save('habits', habits); }, [habits]);
    useEffect(() => { DB.save('kanban', kanban); }, [kanban]);
    useEffect(() => { DB.save('tests', testResults); }, [testResults]);
    useEffect(() => { DB.save('ach', achievements); }, [achievements]);
    useEffect(() => { DB.save('gym', gymData); }, [gymData]);
    useEffect(() => { DB.save('finance', finance); }, [finance]);
    useEffect(() => { DB.save('snowmanLabels', snowmanLabels); }, [snowmanLabels]);
    useEffect(() => { DB.save('snowmanDays', snowmanDays); }, [snowmanDays]);

    useEffect(() => {
        DB.save('theme', theme);
        // Toggle only the theme class. Assigning to `className` here used to
        // replace the whole list, silently dropping anything else on <html>.
        document.documentElement.classList.toggle('light', theme === 'light');
        document.documentElement.classList.toggle('dark', theme !== 'light');
    }, [theme]);

    // --- derived -----------------------------------------------------------
    const todayStr = todayKey();
    const todayLog = logs.find(l => toLocalDateKey(l.date) === todayStr);
    const todayGym = gymData.history.some(w => toLocalDateKey(w.date) === todayStr);
    const todayTest = testResults.some(t => toLocalDateKey(t.date) === todayStr);

    let energy = 5;
    if (todayLog) {
        energy = (todayLog.sleep * 0.4) + (todayLog.mood * 0.3) + (todayLog.focus * 0.3);
        if (todayGym) energy += 0.3;
        if (todayTest) energy += 0.2;
        if (todayLog.hindered?.includes('Телефон')) energy -= 0.3;
        if (todayLog.hindered?.includes('Усталость')) energy -= 0.3;
    }
    energy = Math.max(0, Math.min(10, energy));

    const levelInfo = levelFromXp(computeXp({ logs, habits, kanban, gymData, testResults }).total);

    const reminderCount = reminders.filter(r => !r.done && r.date >= todayStr).length;

    return {
        logs, setLogs,
        diary, setDiary,
        goals, setGoals,
        habits, setHabits,
        kanban, setKanban,
        testResults, setTestResults,
        achievements, setAchievements,
        theme, setTheme,
        gymData, setGymData,
        circles, setCircles,
        reminders, setReminders,
        clinicalResults, setClinicalResults,
        cbtRecords, setCbtRecords,
        finance, setFinance,
        snowmanLabels, setSnowmanLabels,
        snowmanDays, setSnowmanDays,
        prefs, setPrefs,
        dopamineMenu, setDopamineMenu,
        pomodoro, setPomodoro,
        hyperfocus, setHyperfocus,
        rouletteOpen, setRouletteOpen,
        todayStr, todayLog, energy, levelInfo, reminderCount,
    };
}

export function AppStateProvider({ children }: { children: ReactNode }) {
    const value = useAppStateValue();
    return <AppStateContext value={value}>{children}</AppStateContext>;
}

export function useAppState(): AppState {
    const value = use(AppStateContext);
    if (!value) throw new Error('useAppState must be used inside <AppStateProvider>');
    return value;
}
