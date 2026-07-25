import { useState, useEffect } from 'react'
import { DB } from './lib/db';
import { Sidebar } from './components/Sidebar';
import { DraggableDice } from './components/DraggableDice';
import { Dashboard } from './pages/Dashboard';
import { Kanban } from './pages/Kanban';
import { Habits } from './pages/Habits';
import { Notes } from './pages/Notes';
import { Goals } from './pages/Goals';
import { Diary } from './pages/Diary';
import { Dynamics } from './pages/Dynamics';
import { Training } from './pages/Training';
import { Knowledge } from './pages/Knowledge';
import { AboutAdhd } from './pages/AboutAdhd';
import { Settings } from './pages/Settings';
import { UnifiedStats } from './pages/UnifiedStats';
import { Progress } from './pages/Progress';
import { AiPlan } from './pages/AiPlan';
import { UserCard } from './pages/UserCard';
import { CalendarPage } from './pages/CalendarPage';
import { ClinicalTests } from './pages/ClinicalTests';
import { Cbt } from './pages/Cbt';
import { loadPrefs, savePrefs, type Prefs } from './lib/prefs';
import { CirclesOfInfluence } from './pages/CirclesOfInfluence';
import { GymApp } from './features/gym/Gym';
import { DopamineRoulette } from './features/dopamine/DopamineRoulette';
import { HyperfocusOverlay } from './features/hyperfocus/HyperfocusOverlay';

function App() {
    const [page, setPage] = useState('dashboard');
    const [dopamineMenu, setDopamineMenu] = useState(DB.get('dopamineMenu', [
        'Попить воды', 'Сделать растяжку', 'Посмотреть в окно 2 мин', 'Поиграть с котом', 'Закрыть глаза на 1 мин'
      ]));
    const [rouletteOpen, setRouletteOpen] = useState(false);
    const [logs, setLogs] = useState(DB.get('logs'));
    const [diary, setDiary] = useState(DB.get('diary'));
    const [notes, setNotes] = useState(DB.get('notes'));
    const [goals, setGoals] = useState(DB.get('goals'));
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
    const [prefs, setPrefs] = useState<Prefs>(() => loadPrefs());

    useEffect(() => { savePrefs(prefs); }, [prefs]);

    // If the active tab gets hidden from Settings, fall back to the dashboard.
    useEffect(() => {
        if (prefs.hiddenTabs.includes(page)) setPage('dashboard');
    }, [prefs.hiddenTabs, page]);

    useEffect(() => { DB.save('circles', circles); }, [circles]);
    useEffect(() => { DB.save('reminders', reminders); }, [reminders]);
    useEffect(() => { DB.save('clinical', clinicalResults); }, [clinicalResults]);
    useEffect(() => { DB.save('cbt', cbtRecords); }, [cbtRecords]);
    useEffect(() => { DB.save('logs', logs); }, [logs]);
    useEffect(() => { DB.save('dopamineMenu', dopamineMenu); }, [dopamineMenu]);
    useEffect(() => { DB.save('diary', diary); }, [diary]);
    useEffect(() => { DB.save('notes', notes); }, [notes]);
    useEffect(() => { DB.save('goals', goals); }, [goals]);
    useEffect(() => { DB.save('habits', habits); }, [habits]);
    useEffect(() => { DB.save('kanban', kanban); }, [kanban]);
    useEffect(() => { DB.save('tests', testResults); }, [testResults]);
    useEffect(() => { DB.save('ach', achievements); }, [achievements]);
    useEffect(() => { DB.save('gym', gymData); }, [gymData]);

    useEffect(() => {
        DB.save('theme', theme);
        document.documentElement.className = theme;
    }, [theme]);

    // Логика расчета Энергетической Батарейки
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLog = logs.find((l: any) => l.date.split('T')[0] === todayStr);
    const todayGym = gymData.history.some((w: any) => w.date.split('T')[0] === todayStr);
    const todayTest = testResults.some((t: any) => t.date.split('T')[0] === todayStr);

    let energy = 5;
    if (todayLog) {
        energy = (todayLog.sleep * 0.4) + (todayLog.mood * 0.3) + (todayLog.focus * 0.3);
        if (todayGym) energy += 0.3;
        if (todayTest) energy += 0.2;
        if (todayLog.hindered?.includes('Телефон')) energy -= 0.3;
        if (todayLog.hindered?.includes('Усталость')) energy -= 0.3;
    }
    energy = Math.max(0, Math.min(10, energy));

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} energy={energy} todayLog={todayLog}
                prefs={prefs} setPrefs={setPrefs}
                reminderCount={reminders.filter((r: any) => !r.done && r.date >= todayStr).length} />
            <main className="flex-1 p-6 overflow-y-auto relative">
                {page === 'dashboard' && <Dashboard logs={logs} setLogs={setLogs} achievements={achievements} setHyperfocus={setHyperfocus} kanban={kanban} gymData={gymData} testResults={testResults} prefs={prefs} />}
                {page === 'gym' && <GymApp gymData={gymData} setGymData={setGymData} logs={logs} />}
                {page === 'diary' && <Diary diary={diary} setDiary={setDiary} />}
                {page === 'notes' && <Notes notes={notes} setNotes={setNotes} />}
                {page === 'goals' && <Goals goals={goals} setGoals={setGoals} />}
                {page === 'circles' && <CirclesOfInfluence circles={circles} setCircles={setCircles} />}
                {page === 'habits' && <Habits habits={habits} setHabits={setHabits} />}
                {page === 'kanban' && <Kanban kanban={kanban} setKanban={setKanban} />}
                {page === 'dynamics' && <Dynamics logs={logs} testResults={testResults} gymData={gymData} />}
                {page === 'hub' && <UnifiedStats logs={logs} testResults={testResults} gymData={gymData} />}
                {page === 'progress' && <Progress logs={logs} habits={habits} kanban={kanban} gymData={gymData} testResults={testResults} />}
                {page === 'calendar' && <CalendarPage logs={logs} diary={diary} gymData={gymData} reminders={reminders} setReminders={setReminders} />}
                {page === 'card' && <UserCard logs={logs} diary={diary} habits={habits} kanban={kanban} goals={goals} gymData={gymData} testResults={testResults} />}
                {page === 'aiplan' && <AiPlan logs={logs} kanban={kanban} setKanban={setKanban} habits={habits} gymData={gymData} testResults={testResults} energy={energy} />}
                {page === 'cbt' && <Cbt cbtRecords={cbtRecords} setCbtRecords={setCbtRecords} />}
                {page === 'clinical' && <ClinicalTests clinicalResults={clinicalResults} setClinicalResults={setClinicalResults} />}
                {page === 'training' && <Training setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
                {page === 'knowledge' && <Knowledge setPage={setPage} />}
                {page === 'about' && <AboutAdhd />}
                {page === 'settings' && <Settings diary={diary} logs={logs} prefs={prefs} setPrefs={setPrefs} />}
            </main>

            {hyperfocus && <HyperfocusOverlay hyperfocus={hyperfocus} setHyperfocus={setHyperfocus} kanban={kanban} setDiary={setDiary} setLogs={setLogs} todayLog={todayLog} />}
            {/* Плавающая кнопка рулетки — перетаскивается по экрану */}
            <DraggableDice onClick={() => setRouletteOpen(true)} />

            {rouletteOpen && (
                <DopamineRoulette
                    kanban={kanban}
                    setKanban={setKanban}
                    dopamineMenu={dopamineMenu}
                    setDopamineMenu={setDopamineMenu}
                    onClose={() => setRouletteOpen(false)}
                />
            )}
        </div>
    );
}

export default App;
