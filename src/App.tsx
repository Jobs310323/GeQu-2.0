import { useState, useEffect, useMemo, useRef } from 'react'
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { DB } from './lib/db';
import { usePersisted } from './lib/usePersisted';
import { CloudSync } from './components/CloudSync';
import { AuthGate } from './components/AuthGate';
import { isGuestMode, exitGuestMode } from './lib/guest';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Kanban } from './pages/Kanban';
import { Habits } from './pages/Habits';
import { Goals } from './pages/Goals';
import { MindMap } from './pages/MindMap';
import { Diary } from './pages/Diary';
import { Training } from './pages/Training';
import { Knowledge } from './pages/Knowledge';
import { Settings } from './pages/Settings';
import { UnifiedStats } from './pages/UnifiedStats';
import { Progress } from './pages/Progress';
import { AiPlan } from './pages/AiPlan';
import { UserCard } from './pages/UserCard';
import { CalendarPage } from './pages/CalendarPage';
import { ClinicalTests } from './pages/ClinicalTests';
import { loadPrefs, savePrefs, type Prefs } from './lib/prefs';
import { CirclesOfInfluence } from './pages/CirclesOfInfluence';
import { Finance, DEFAULT_FINANCE } from './pages/Finance';
import { GymApp } from './features/gym/Gym';
import { Snowman } from './features/snowman/Snowman';
import type { ActivityLabel, DayRecord } from './features/snowman/types';
import { DopamineRoulette } from './features/dopamine/DopamineRoulette';
import { HyperfocusOverlay } from './features/hyperfocus/HyperfocusOverlay';
import { computeXp, levelFromXp } from './lib/xp';

/** The real app, mounted only once Clerk confirms a signed-in user. */
function GequApp({ guestMode, onExitGuest }: { guestMode?: boolean; onExitGuest?: () => void }) {
    const [page, setPage] = useState('dashboard');
    const [dopamineMenu, setDopamineMenu] = useState(DB.get('dopamineMenu', [
        'Попить воды', 'Сделать растяжку', 'Посмотреть в окно 2 мин', 'Поиграть с котом', 'Закрыть глаза на 1 мин'
      ]));
    const [rouletteOpen, setRouletteOpen] = useState(false);
    const [logs, setLogs] = useState(DB.get('logs'));
    const [diary, setDiary] = useState(DB.get('diary'));
    const [goals, setGoals] = useState(DB.get('goals'));
    const goalsSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [habits, setHabits] = useState(DB.get('habits'));
    const [kanban, setKanban] = useState(DB.get('kanban'));
    const [testResults, setTestResults] = useState(DB.get('tests', []));
    const [achievements, setAchievements] = useState(DB.get('ach', []));
    const [theme, setTheme] = useState(DB.get('theme', 'dark'));
    const [gymData, setGymData] = useState(DB.get('gym', { programs: [], history: [], activeProgramId: null }));
    const [hyperfocus, setHyperfocus] = useState<any>(null); // Новое состояние для гиперфокуса
    const [circles, setCircles] = useState(DB.get('circles', []));
    const [reminders, setReminders] = useState(DB.get('reminders', []));
    const [clinicalResults, setClinicalResults] = useState(DB.get('clinical', []));
    const [cbtRecords, setCbtRecords] = useState(DB.get('cbt', []));
    const [finance, setFinance] = useState(DB.get('finance', DEFAULT_FINANCE));
    const [snowmanLabels, setSnowmanLabels] = useState<ActivityLabel[]>(DB.get('snowmanLabels', []));
    const [snowmanDays, setSnowmanDays] = useState<DayRecord[]>(DB.get('snowmanDays', []));
    const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());
    // Lives here (not inside the Pomodoro tab) so switching pages never pauses
    // or resets a running timer — only the tab is unmounted, not the app.
    const [pomodoro, setPomodoro] = useState({ workTime: 25, mode: 'work' as 'work' | 'break', timeLeft: 25 * 60, isRunning: false });

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

    // If the active tab gets hidden from Settings, fall back to the dashboard.
    useEffect(() => {
        if (prefs.hiddenTabs.includes(page)) setPage('dashboard');
    }, [prefs.hiddenTabs, page]);

    usePersisted('circles', circles);
    usePersisted('reminders', reminders);
    usePersisted('clinical', clinicalResults);
    usePersisted('cbt', cbtRecords);
    usePersisted('logs', logs);
    usePersisted('dopamineMenu', dopamineMenu);
    usePersisted('diary', diary);
    // Goals stay on their own debounced effect: they are edited character by
    // character in the tree editor, so they need coalescing the others don't.
    useEffect(() => {
        if (goalsSaveTimer.current) clearTimeout(goalsSaveTimer.current);
        goalsSaveTimer.current = setTimeout(() => DB.save('goals', goals), 500);
        return () => { if (goalsSaveTimer.current) clearTimeout(goalsSaveTimer.current); };
    }, [goals]);
    usePersisted('habits', habits);
    usePersisted('kanban', kanban);
    usePersisted('tests', testResults);
    usePersisted('ach', achievements);
    usePersisted('gym', gymData);
    usePersisted('finance', finance);
    usePersisted('snowmanLabels', snowmanLabels);
    usePersisted('snowmanDays', snowmanDays);

    useEffect(() => {
        DB.save('theme', theme);
        document.documentElement.className = theme;
    }, [theme]);

    // Логика расчета Энергетической Батарейки
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = logs.find((l: any) => l.date.split('T')[0] === todayStr);
    const todayGym = gymData.history.some((w: any) => w.date.split('T')[0] === todayStr);
    const todayTest = testResults.some((t: any) => t.date.split('T')[0] === todayStr);

    const energy = useMemo(() => {
        let e = 5;
        if (todayLog) {
            e = (todayLog.sleep * 0.4) + (todayLog.mood * 0.3) + (todayLog.focus * 0.3);
            if (todayGym) e += 0.3;
            if (todayTest) e += 0.2;
            if (todayLog.hindered?.includes('Телефон')) e -= 0.3;
            if (todayLog.hindered?.includes('Усталость')) e -= 0.3;
        }
        return Math.max(0, Math.min(10, e));
    }, [todayLog, todayGym, todayTest]);

    // Every slice of app state lives in this component, so it re-renders on any
    // change anywhere — a keystroke in Finance used to re-walk every log, habit,
    // task, workout and test result, and hand Sidebar a brand-new `levelInfo`.
    const levelInfo = useMemo(
        () => levelFromXp(computeXp({ logs, habits, kanban, gymData, testResults }).total),
        [logs, habits, kanban, gymData, testResults],
    );

    // Every page as a lookup, keyed by nav id.
    const PAGES: Record<string, any> = {
        gym: <GymApp gymData={gymData} setGymData={setGymData} logs={logs} />,
        diary: <Diary diary={diary} setDiary={setDiary} />,
        goals: <Goals goals={goals} setGoals={setGoals} />,
        mindmap: <MindMap />,
        circles: <CirclesOfInfluence circles={circles} setCircles={setCircles} />,
        habits: <Habits habits={habits} setHabits={setHabits} />,
        kanban: <Kanban kanban={kanban} setKanban={setKanban} />,
        hub: <UnifiedStats logs={logs} testResults={testResults} gymData={gymData} />,
        progress: <Progress logs={logs} habits={habits} kanban={kanban} gymData={gymData} testResults={testResults} diary={diary} snowmanDays={snowmanDays} />,
        snowman: <Snowman labels={snowmanLabels} setLabels={setSnowmanLabels} days={snowmanDays} setDays={setSnowmanDays} />,
        calendar: <CalendarPage logs={logs} diary={diary} gymData={gymData} reminders={reminders} setReminders={setReminders} />,
        card: <UserCard logs={logs} setLogs={setLogs} diary={diary} habits={habits} kanban={kanban} goals={goals} gymData={gymData}
            testResults={testResults} clinicalResults={clinicalResults} cbtRecords={cbtRecords}
            finance={finance} circles={circles} setPage={setPage} />,
        aiplan: <AiPlan logs={logs} kanban={kanban} setKanban={setKanban} habits={habits} gymData={gymData} testResults={testResults} energy={energy} />,
        clinical: <ClinicalTests clinicalResults={clinicalResults} setClinicalResults={setClinicalResults}
            cbtRecords={cbtRecords} setCbtRecords={setCbtRecords} />,
        training: <Training setTestResults={setTestResults} testResults={testResults} achievements={achievements} setAchievements={setAchievements}
            pomodoro={pomodoro} setPomodoro={setPomodoro} />,
        knowledge: <Knowledge setPage={setPage} />,
        settings: <Settings diary={diary} logs={logs} prefs={prefs} setPrefs={setPrefs} />,
        finance: <Finance finance={finance} setFinance={setFinance} />,
    };

    const dashProps = {
        logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults, prefs,
        // The dashboard doubles as an overview, so it needs the same figures the
        // sidebar shows plus enough state to tick a habit without leaving.
        habits, setHabits, setPage, levelInfo, energy,
    };

    return (
        <div className={`flex h-screen overflow-hidden ${guestMode ? 'pt-8' : ''} relative`}>
            {guestMode && (
                <div className="fixed top-0 inset-x-0 z-50 h-8 flex items-center justify-center gap-3 text-xs bg-[var(--gq-grad-a,#7c6cf6)]/20 border-b border-[var(--border)] text-[var(--text-main)]">
                    <span>Гостевой режим — данные хранятся только в этом браузере, без облачной синхронизации</span>
                    {onExitGuest && (
                        <button onClick={onExitGuest} className="underline underline-offset-2 hover:text-[var(--gq-grad-a,#7c6cf6)]">
                            Войти в аккаунт
                        </button>
                    )}
                </div>
            )}
            <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} energy={energy} todayLog={todayLog}
                prefs={prefs} setPrefs={setPrefs} levelInfo={levelInfo}
                onRoulette={() => setRouletteOpen(true)}
                reminderCount={reminders.filter((r: any) => !r.done && r.date >= todayStr).length} />
            <main className="flex-1 p-6 overflow-y-auto relative">
                {page === 'dashboard' ? <Dashboard {...dashProps} /> : PAGES[page] ?? null}
            </main>

            {hyperfocus && <HyperfocusOverlay hyperfocus={hyperfocus} setHyperfocus={setHyperfocus} kanban={kanban} setDiary={setDiary} setLogs={setLogs} todayLog={todayLog} />}

            {rouletteOpen && (
                <DopamineRoulette
                    kanban={kanban}
                    setKanban={setKanban}
                    dopamineMenu={dopamineMenu}
                    energy={energy}
                    setDopamineMenu={setDopamineMenu}
                    onClose={() => setRouletteOpen(false)}
                />
            )}
        </div>
    );
}

/** Gates the whole app behind auth: each account only ever sees its own data.
 * A signed-out visitor can also continue as a guest — local-only data, no
 * CloudSync — so the app (and any design change) can be checked without
 * creating an account. Signing in for real always takes priority over a
 * stale guest flag, since <SignedIn> is checked first. */
function App() {
    const [guestMode, setGuestMode] = useState(isGuestMode());

    return (
        <>
            <SignedIn>
                <CloudSync />
                <GequApp />
            </SignedIn>
            <SignedOut>
                {guestMode
                    ? <GequApp guestMode onExitGuest={() => { exitGuestMode(); setGuestMode(false); }} />
                    : <AuthGate onGuest={() => setGuestMode(true)} />}
            </SignedOut>
        </>
    );
}

export default App;
