import { useState, useEffect } from 'react'
import { DB } from './lib/db';
import { Sidebar } from './components/Sidebar';
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

    useEffect(() => { DB.save('circles', circles); }, [circles]);
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
            <Sidebar page={page} setPage={setPage} theme={theme} setTheme={setTheme} energy={energy} todayLog={todayLog} setHyperfocus={setHyperfocus} kanban={kanban} setDiary={setDiary} setLogs={setLogs} />
            <main className="flex-1 p-10 overflow-y-auto relative">
                {page === 'dashboard' && <Dashboard logs={logs} setLogs={setLogs} achievements={achievements} setHyperfocus={setHyperfocus} kanban={kanban} gymData={gymData} testResults={testResults} />}
                {page === 'gym' && <GymApp gymData={gymData} setGymData={setGymData} logs={logs} />}
                {page === 'diary' && <Diary diary={diary} setDiary={setDiary} />}
                {page === 'notes' && <Notes notes={notes} setNotes={setNotes} />}
                {page === 'goals' && <Goals goals={goals} setGoals={setGoals} />}
                {page === 'circles' && <CirclesOfInfluence circles={circles} setCircles={setCircles} />}
                {page === 'habits' && <Habits habits={habits} setHabits={setHabits} />}
                {page === 'kanban' && <Kanban kanban={kanban} setKanban={setKanban} />}
                {page === 'dynamics' && <Dynamics logs={logs} testResults={testResults} gymData={gymData} />}
                {page === 'hub' && <UnifiedStats logs={logs} testResults={testResults} gymData={gymData} />}
                {page === 'training' && <Training setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
                {page === 'knowledge' && <Knowledge />}
                {page === 'about' && <AboutAdhd />}
                {page === 'settings' && <Settings diary={diary} logs={logs} />}
            </main>

            {hyperfocus && <HyperfocusOverlay hyperfocus={hyperfocus} setHyperfocus={setHyperfocus} kanban={kanban} setDiary={setDiary} setLogs={setLogs} todayLog={todayLog} />}
            {/* Плавающая кнопка рулетки */}
            <button onClick={() => setRouletteOpen(true)}
                    className="fixed bottom-8 left-8 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black text-3xl font-bold shadow-lg shadow-cyan-400/30 hover:scale-110 transition z-40 flex items-center justify-center">
                🎲
            </button>

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
