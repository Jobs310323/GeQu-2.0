import { useState, useEffect, useRef } from 'react'
import Chart from 'chart.js/auto';
import { marked } from 'marked';

const DB = {
    get: (key: string, def: any = []) => JSON.parse(localStorage.getItem(`gequ_${key}`)) || def,
    save: (key: string, data: any) => localStorage.setItem(`gequ_${key}`, JSON.stringify(data)),
};

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

function Sidebar({ page, setPage, theme, setTheme, energy, todayLog, setHyperfocus, kanban }: any) {
    const navItems = [
        { id: 'dashboard', icon: '⬢', label: 'Дашборд' },
        { id: 'gym', icon: '🏋️', label: 'Зал' },
        { id: 'kanban', icon: '📋', label: 'Канбан' },
        { id: 'habits', icon: '♻️', label: 'Привычки' },
        { id: 'goals', icon: '🚩', label: 'Цели' },
        { id: 'diary', icon: '📓', label: 'Дневник' },
        { id: 'notes', icon: '📌', label: 'Записки' },
        { id: 'dynamics', icon: '📈', label: 'Динамика' },
        { id: 'hub', icon: '📊', label: 'Хаб' },
        { id: 'circles', icon: '🎯', label: 'Круги' },
        { id: 'training', icon: '🎯', label: 'Тренировки' },
        { id: 'knowledge', icon: '📚', label: 'База знаний' },
        { id: 'about', icon: '🧠', label: 'Про СДВГ' },
        { id: 'settings', icon: '⚙️', label: 'Настройки' },
    ];

    const energyColor = energy >= 7 ? 'bg-green-400' : energy >= 4 ? 'bg-yellow-400' : 'bg-red-400';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;

    return (
        <aside className="w-60 p-6 border-r border-[var(--border)] flex flex-col gap-2 backdrop-blur-md overflow-y-auto">
            <div className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                GeQu
            </div>
            
            {navItems.map(item => (
                <div key={item.id} onClick={() => setPage(item.id)}
                    className={`p-3 rounded-lg cursor-pointer transition flex items-center gap-3 ${
                        page === item.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}>
                    <span>{item.icon}</span> {item.label}
                </div>
            ))}

            {/* Энергетическая Батарейка */}
            <div className="mt-4 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] group relative">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Энергия</span>
                    <span className="text-xs font-bold text-white">{energy.toFixed(1)}/10</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
                    <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{energyText}</div>
                
                {/* Детальный разбор при наведении */}
                {todayLog && (
                    <div className="absolute left-full ml-2 top-0 w-48 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="text-xs text-gray-400 mb-2">Разбор энергии:</p>
                        <p className="text-xs text-white">Сон: <span className="text-purple-400">{(todayLog.sleep * 0.4).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Настроение: <span className="text-purple-400">{(todayLog.mood * 0.3).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Фокус: <span className="text-purple-400">{(todayLog.focus * 0.3).toFixed(1)}</span></p>
                    </div>
                )}
            </div>

            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="mt-2 p-3 rounded-lg text-gray-400 hover:bg-white/5 border border-[var(--border)]">
                {theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
            </button>
        </aside>
    );
}

function calculateStreak(logs: any[]) {
    if (logs.length === 0) return 0;
    const days = [...new Set(logs.map((l: any) => new Date(l.date).setHours(0,0,0,0)))].sort((a,b) => b-a);
    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    if (days[0] !== today && days[0] !== yesterday) return 0;
    let streak = 1;
    for (let i = 0; i < days.length - 1; i++) {
        if (days[i] - days[i+1] === 86400000) streak++;
        else break;
    }
    return streak;
}


function Dashboard({ logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults }: any) {
    const [sleep, setSleep] = useState(5);
    const [focus, setFocus] = useState(5);
    const [mood, setMood] = useState(5);
    const [helped, setHelped] = useState<string[]>([]); 
    const [hindered, setHindered] = useState<string[]>([]); 
    const [mainEvent, setMainEvent] = useState('');
    const [testTomorrow, setTestTomorrow] = useState('');
    const [toast, setToast] = useState('');
    const streak = calculateStreak(logs);

    // НОВОЕ: Состояние для благодарностей и SOS
    const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
    const [sosModal, setSosModal] = useState(false);
    const [sosGratitudes, setSosGratitudes] = useState<string[]>([]);

    // Состояние плиток Сканирования тела
    const todayStr = new Date().toISOString().split('T')[0];
    const todayGym = gymData.history.some((w: any) => w.date.split('T')[0] === todayStr);
    const todayTest = testResults.some((t: any) => t.date.split('T')[0] === todayStr);

    const bodyScanItems = [
        { id: '☀️ Солнце', label: 'Солнце > 15 мин', auto: false },
        { id: '💧 Вода', label: 'Вода 1.5+ л', auto: false },
        { id: '🍽 Питание', label: '3 приема без срывов', auto: false },
        { id: '📱 Без телефона', label: 'Без телефона 1ч', auto: false },
        { id: '🧘 Дыхание', label: 'Пауза/Дыхание', auto: false },
        { id: '📖 Чтение', label: 'Чтение 10+ стр', auto: false },
        { id: '🚶 Шаги', label: '5000+ шагов', auto: false },
        { id: '🎯 Задача', label: '1 главная задача', auto: false },
        { id: '🏋️ Зал', label: 'Тренировка', auto: todayGym },
        { id: '🧠 Тест', label: 'Когнитивный тест', auto: todayTest },
    ];
    const [bodyScan, setBodyScan] = useState<string[]>(bodyScanItems.filter((b: any) => b.auto).map((b: any) => b.id));

    const toggleScan = (id: string) => setBodyScan(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

    const toggleTag = (tag: string, type: 'helped' | 'hindered') => {
        if (type === 'helped') setHelped(prev => prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]);
        else setHindered(prev => prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]);
    };

    // НОВОЕ: Функция SOS
    const handleSOS = () => {
        // Собираем все благодарности из прошлых дней
        const allGratitudes = logs.flatMap((l: any) => l.gratitude || []);
        if (allGratitudes.length === 0) {
            setSosGratitudes(['Ты обязательно справишься. Даже если сегодня всё валится из рук — это временно. Дыши.']);
        } else {
            // Перемешиваем массив и берем 3 случайных
            const shuffled = [...allGratitudes].sort(() => 0.5 - Math.random());
            setSosGratitudes(shuffled.slice(0, 3));
        }
        setSosModal(true);
    };

    const handleSave = () => {
        const allHelped = [...helped, ...bodyScan];
        // НОВОЕ: Добавляем gratitude в объект лога
        const newLog = { 
            id: Date.now(), 
            date: new Date().toISOString(), 
            sleep: parseInt(sleep), 
            focus: parseInt(focus), 
            mood: parseInt(mood), 
            helped: allHelped, 
            hindered, 
            mainEvent, 
            testTomorrow,
            gratitude: gratitude.filter(g => g.trim() !== '') // Сохраняем только заполненные
        };
        setLogs([...logs, newLog]);
        // Сброс
        setSleep(5); setFocus(5); setMood(5); setHelped([]); setHindered([]); setMainEvent(''); setTestTomorrow(''); setGratitude(['', '', '']);
        setToast('День закрыт! Запись сохранена.');
        setTimeout(() => setToast(''), 2500);
    };

    const startHyper = () => {
        const todoTasks = kanban.filter((t:any) => t.status === 'todo' || t.status === 'doing');
        setHyperfocus({ status: 'setup', duration: 25, task: todoTasks[0]?.text || 'Своя задача', todoTasks });
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-3xl font-bold">Закрытие дня</h1>
                {/* НОВОЕ: Кнопка SOS */}
                <button onClick={handleSOS} className="px-4 py-2 rounded-xl border border-pink-400/30 text-pink-400 hover:bg-pink-400/10 transition text-sm font-bold flex items-center gap-2">
                    🆘 Мне плохо
                </button>
            </div>
            <p className="text-gray-400 mb-6">Подведите итоги, чтобы отпустить мысли и отдохнуть.</p>
            
            <button onClick={startHyper} className="w-full glass-card p-6 rounded-2xl mb-6 border border-cyan-400/30 hover:bg-cyan-400/10 transition flex items-center justify-between group">
                <div className="flex items-center gap-4">
                    <div className="text-4xl">🚀</div>
                    <div className="text-left">
                        <h2 className="text-xl font-bold text-cyan-400">Войти в гиперфокус</h2>
                        <p className="text-gray-400 text-sm">Запустить таймер и заблокировать отвлечения</p>
                    </div>
                </div>
                <span className="text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity text-2xl">→</span>
            </button>

            <div className="glass-card p-6 rounded-2xl mb-6 flex items-center gap-6 fire-glow">
                <div className="text-5xl">🔥</div>
                <div>
                    <div className="text-4xl font-bold text-pink-400">{streak}</div>
                    <div className="text-gray-400 text-sm">дней подряд</div>
                </div>
                <div className="ml-auto text-right">
                    <div className="text-xl font-bold text-cyan-400">Ачивки</div>
                    <div className="text-gray-400 text-sm mt-1">{achievements.length === 0 ? 'Пока нет' : achievements.length} шт.</div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-5">📊 Оцените сегодняшний день</h2>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2"><span>Сон</span><span className="text-cyan-400">{sleep}/10</span></div>
                        <input type="range" min="0" max="10" value={sleep} onChange={e => setSleep(e.target.value)} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2"><span>Фокус</span><span className="text-cyan-400">{focus}/10</span></div>
                        <input type="range" min="0" max="10" value={focus} onChange={e => setFocus(e.target.value)} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2"><span>Настроение</span><span className="text-cyan-400">{mood}/10</span></div>
                        <input type="range" min="0" max="10" value={mood} onChange={e => setMood(e.target.value)} className="w-full accent-cyan-400" />
                    </div>
                </div>
            </div>

            {/* СКАНИРОВАНИЕ ТЕЛА */}
            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">🧠 Сканирование тела (Быстрый чекап)</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {bodyScanItems.map(item => {
                        const isActive = bodyScan.includes(item.id);
                        return (
                            <button key={item.id} onClick={() => !item.auto && toggleScan(item.id)} disabled={item.auto}
                                className={`p-3 rounded-xl border text-left transition ${isActive ? 'bg-green-400/20 border-green-400 text-white' : 'bg-[var(--bg-input)] border-[var(--border)] text-gray-400'} ${item.auto ? 'cursor-not-allowed opacity-80' : 'hover:border-green-400'}`}>
                                <span className="block text-sm font-medium">{item.id}</span>
                                <span className="text-xs opacity-70">{item.label}</span>
                                {item.auto && <span className="block text-[10px] text-green-400 mt-1">Авто</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="glass-card p-6 rounded-2xl">
                    <h2 className="text-xl mb-4">✅ Что помогло сегодня?</h2>
                    <div className="flex flex-wrap gap-2">
                        {['Кофе', 'Спорт', 'Сон', 'Pomodoro', 'Интерес к задаче', 'Медитация'].map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag, 'helped')}
                                className={`px-4 py-1 rounded-full text-sm border transition ${helped.includes(tag) ? 'bg-green-400/20 border-green-400 text-green-400' : 'border-[var(--border)] text-gray-400 hover:border-green-400'}`}>{tag}</button>
                        ))}
                    </div>
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <h2 className="text-xl mb-4">⚠️ Что мешало сегодня?</h2>
                    <div className="flex flex-wrap gap-2">
                        {['Телефон', 'Усталость', 'Шум', 'Скука', 'Голод', 'Откладывание'].map(tag => (
                            <button key={tag} onClick={() => toggleTag(tag, 'hindered')}
                                className={`px-4 py-1 rounded-full text-sm border transition ${hindered.includes(tag) ? 'bg-red-400/20 border-red-400 text-red-400' : 'border-[var(--border)] text-gray-400 hover:border-red-400'}`}>{tag}</button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">📝 Главное событие дня</h2>
                <textarea value={mainEvent} onChange={e => setMainEvent(e.target.value)} placeholder="Что было самым важным сегодня?" className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">🧪 Что хочу проверить завтра?</h2>
                <textarea value={testTomorrow} onChange={e => setTestTomorrow(e.target.value)} placeholder="Идея для эксперимента над собой..." className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
            </div>

            {/* НОВОЕ: Блок Благодарности */}
            <div className="glass-card p-6 rounded-2xl mb-6 border border-pink-400/20">
                <h2 className="text-xl mb-2">💖 За что благодарен сегодня?</h2>
                <p className="text-gray-400 text-sm mb-4">Найди 3 хороших момента. В плохие дни они тебя поддержат.</p>
                <div className="space-y-3">
                    {gratitude.map((g, i) => (
                        <input key={i} type="text" value={g} 
                               onChange={e => setGratitude(prev => prev.map((item, idx) => idx === i ? e.target.value : item))}
                               placeholder={`Момент ${i+1}...`}
                               className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-pink-400 text-white" />
                    ))}
                </div>
            </div>

            <button onClick={handleSave} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg text-lg">Закрыть день</button>

            {toast && <div className="fixed bottom-8 right-8 bg-white/10 border border-cyan-400 px-6 py-3 rounded-lg text-white">{toast}</div>}

            {/* НОВОЕ: Модальное окно SOS */}
            {sosModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={() => setSosModal(false)}>
                    <div className="glass-card p-8 rounded-2xl max-w-lg w-full text-center border border-pink-400/30 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="text-5xl mb-4">💕</div>
                        <h2 className="text-2xl font-bold text-pink-400 mb-2">Якоря радости</h2>
                        <p className="text-gray-400 mb-6 text-sm">Вспомни эти моменты. Всё было не зря. Ты молодец.</p>
                        <div className="space-y-4 mb-8">
                            {sosGratitudes.map((g, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white/5 text-white border border-[var(--border)] text-lg">
                                    "{g}"
                                </div>
                            ))}
                        </div>
                        <button onClick={() => setSosModal(false)} className="bg-gradient-to-r from-pink-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                            Спасибо, мне лучше
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function Kanban({ kanban, setKanban }: any) {
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState('low');

    const addTask = () => {
        if (!newTask.trim()) return;
        setKanban([...kanban, { id: Date.now(), text: newTask, status: 'todo', priority: newPriority }]);
        setNewTask('');
    };
    const moveTask = (id: number, dir: number) => {
        const stages = ['todo', 'doing', 'done'];
        setKanban(kanban.map((t: any) => {
            if (t.id === id) {
                const currentIndex = stages.indexOf(t.status);
                const nextIndex = currentIndex + dir;
                if (nextIndex >= 0 && nextIndex < stages.length) return { ...t, status: stages[nextIndex] };
            }
            return t;
        }));
    };
    const deleteTask = (id: number) => setKanban(kanban.filter((t: any) => t.id !== id));

    const columns = [
        { id: 'todo', title: 'Сделать', color: 'text-gray-400' },
        { id: 'doing', title: 'В процессе', color: 'text-cyan-400' },
        { id: 'done', title: 'Готово', color: 'text-green-400' }
    ];

    const getPriorityClass = (p: string) => {
        if (p === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
        if (p === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        return 'bg-green-500/20 text-green-400 border-green-500/30';
    }

    const getPriorityLabel = (p: string) => {
        if (p === 'high') return '🔴 Срочно';
        if (p === 'medium') return '🟡 Средне';
        return '🟢 Низкий';
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Канбан-доска</h1>
            <div className="glass-card p-4 rounded-xl mb-6 flex flex-col md:flex-row gap-4">
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Новая задача..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400 text-white" />
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400 text-white">
                    <option value="low">🟢 Низкий приоритет</option>
                    <option value="medium">🟡 Средний приоритет</option>
                    <option value="high">🔴 Срочный приоритет</option>
                </select>
                <button onClick={addTask} className="bg-cyan-400 text-black font-bold px-6 py-2 rounded-lg">Добавить</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map(col => (
                    <div key={col.id} className="glass-card p-4 rounded-2xl min-h-[400px]">
                        <h2 className={`text-lg font-bold mb-4 ${col.color}`}>{col.title} ({kanban.filter((t:any) => t.status === col.id).length})</h2>
                        <div className="space-y-3">
                            {kanban.filter((t:any) => t.status === col.id).map((t:any) => (
                                <div key={t.id} className="bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border)]">
                                    <div className={`text-xs px-2 py-1 rounded inline-block mb-2 border ${getPriorityClass(t.priority)}`}>
                                        {getPriorityLabel(t.priority)}
                                    </div>
                                    <p className="text-sm mb-3 text-white">{t.text}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button onClick={() => moveTask(t.id, -1)} disabled={col.id === 'todo'} className="text-xs px-2 py-1 bg-white/5 rounded disabled:opacity-20">←</button>
                                            <button onClick={() => moveTask(t.id, 1)} disabled={col.id === 'done'} className="text-xs px-2 py-1 bg-white/5 rounded disabled:opacity-20">→</button>
                                        </div>
                                        <button onClick={() => deleteTask(t.id)} className="text-red-400 text-xs">✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Habits({ habits, setHabits }: any) {
    const [name, setName] = useState('');
    const todayStr = new Date().toISOString().split('T')[0];

    const addHabit = () => {
        if (!name.trim()) return;
        setHabits([...habits, { id: Date.now(), name, history: [] }]);
        setName('');
    };
    const toggleHabit = (id: number) => {
        setHabits(habits.map((h: any) => {
            if (h.id === id) {
                const done = h.history.includes(todayStr);
                return { ...h, history: done ? h.history.filter((d: string) => d !== todayStr) : [...h.history, todayStr] };
            }
            return h;
        }));
    };
    const deleteHabit = (id: number) => setHabits(habits.filter((h: any) => h.id !== id));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Трекер привычек</h1>
            <div className="glass-card p-4 rounded-xl mb-6 flex gap-4">
                <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()}
                    placeholder="Новая привычка (напр., Пить воду)..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                <button onClick={addHabit} className="bg-cyan-400 text-black font-bold px-6 py-2 rounded-lg">Добавить</button>
            </div>
            <div className="space-y-4">
                {habits.map((h:any) => {
                    const doneToday = h.history.includes(todayStr);
                    const streak = h.history.length; 
                    return (
                        <div key={h.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <button onClick={() => toggleHabit(h.id)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition ${doneToday ? 'bg-green-400 border-green-400 text-black' : 'border-gray-500 text-transparent hover:border-green-400' }`}>✓</button>
                                <div>
                                    <span className="text-lg">{h.name}</span>
                                    <div className="text-xs text-gray-400">Серия: {streak} дней</div>
                                </div>
                            </div>
                            <button onClick={() => deleteHabit(h.id)} className="text-red-400 text-sm">Удалить</button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function Notes({ notes, setNotes }: any) {
    const [text, setText] = useState('');
    const addNote = () => {
        if (!text.trim()) return;
        setNotes([{ id: Date.now(), text, color: Math.floor(Math.random()*360) }, ...notes]);
        setText('');
    };
    const deleteNote = (id: number) => setNotes(notes.filter((n: any) => n.id !== id));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Быстрые записки</h1>
            <p className="text-gray-400 text-sm mb-6">Поддерживается Markdown: <b>**жирный**</b>, <i>*курсив*</i>, <b># Заголовок</b>, <b>- список</b>.</p>
            <div className="glass-card p-6 rounded-2xl mb-6 flex flex-col gap-4">
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Запиши мысль..."
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                <button onClick={addNote} className="self-start bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Прикрепить</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {notes.map((note:any) => (
                    <div key={note.id} className="note-card relative p-4 rounded-lg shadow-lg min-h-[150px] overflow-hidden"
                        style={{ backgroundColor: `hsla(${note.color}, 70%, 50%, 0.2)`, border: `1px solid hsla(${note.color}, 70%, 50%, 0.4)` }}>
                        <div className="text-white markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(note.text) }}></div>
                        <button onClick={() => deleteNote(note.id)} className="absolute top-2 right-2 text-white/50 hover:text-white text-sm">✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}

function Goals({ goals, setGoals }: any) {
    const [newGoal, setNewGoal] = useState('');
    const addGoal = () => { if (!newGoal.trim()) return; setGoals([...goals, { id: Date.now(), title: newGoal, tasks: [] }]); setNewGoal(''); };
    const addTask = (goalId: number, taskText: string) => setGoals(goals.map((g:any) => g.id === goalId ? { ...g, tasks: [...g.tasks, { id: Date.now(), text: taskText, done: false }] } : g));
    const toggleTask = (goalId: number, taskId: number) => setGoals(goals.map((g:any) => g.id === goalId ? { ...g, tasks: g.tasks.map((t:any) => t.id === taskId ? { ...t, done: !t.done } : t) } : g));
    const deleteGoal = (goalId: number) => setGoals(goals.filter((g:any) => g.id !== goalId));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Цели и шаги</h1>
            <div className="glass-card p-6 rounded-2xl mb-6 flex gap-4">
                <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="Новая большая цель..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-cyan-400" />
                <button onClick={addGoal} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Добавить цель</button>
            </div>
            <div className="space-y-6">
                {goals.map((goal:any) => {
                    const doneCount = goal.tasks.filter((t:any) => t.done).length;
                    const progress = goal.tasks.length > 0 ? (doneCount / goal.tasks.length) * 100 : 0;
                    return (
                        <div key={goal.id} className="glass-card p-6 rounded-2xl">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold">{goal.title}</h2>
                                <div className="flex items-center gap-4">
                                    <span className="text-cyan-400 text-sm">{doneCount}/{goal.tasks.length}</span>
                                    <button onClick={() => deleteGoal(goal.id)} className="text-red-400 hover:text-red-300 text-sm">Удалить</button>
                                </div>
                            </div>
                            <div className="w-full bg-black/30 h-2 rounded-full mb-6"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                            <TaskInput goalId={goal.id} addTask={addTask} />
                            <div className="space-y-2 mt-4">
                                {goal.tasks.map((task:any) => (
                                    <div key={task.id} className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg">
                                        <input type="checkbox" checked={task.done} onChange={() => toggleTask(goal.id, task.id)} className="w-5 h-5 cursor-pointer" />
                                        <span className={task.done ? 'line-through text-gray-500' : 'text-gray-200'}>{task.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function TaskInput({ goalId, addTask }: any) {
    const [text, setText] = useState('');
    return (
        <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { addTask(goalId, text); setText(''); } }} placeholder="Добавить шаг..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-400" />
            <button onClick={() => { if(text.trim()) { addTask(goalId, text); setText(''); } }} className="bg-purple-400/20 text-purple-400 border border-purple-400 px-4 py-2 rounded-lg text-sm">+</button>
        </div>
    );
}

function Diary({ diary, setDiary }: any) {
    const [newEntry, setNewEntry] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const addEntry = () => { if (!newEntry.trim()) return; setDiary([{ id: Date.now(), date: new Date().toISOString(), content: newEntry }, ...diary]); setNewEntry(''); };
    const deleteEntry = (id: number) => setDiary(diary.filter((entry:any) => entry.id !== id));
    const saveEdit = (id: number) => { setDiary(diary.map((entry:any) => entry.id === id ? { ...entry, content: editText } : entry)); setEditingId(null); };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Дневник мыслей</h1>
            <p className="text-gray-400 text-sm mb-6">Поддерживается Markdown для форматирования записей.</p>
            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">Новая запись</h2>
                <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 mb-3 min-h-[100px] outline-none focus:border-cyan-400 text-white" placeholder="Что у вас в голове?" value={newEntry} onChange={e => setNewEntry(e.target.value)} />
                <button onClick={addEntry} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Добавить</button>
            </div>
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl mb-4">История</h2>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {diary.map((entry:any) => (
                        <div key={entry.id} className="border-b border-[var(--border)] pb-4">
                            <div className="text-xs text-cyan-400 mb-2">{new Date(entry.date).toLocaleString('ru-RU')}</div>
                            {editingId === entry.id ? (
                                <div>
                                    <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 mb-2 outline-none focus:border-cyan-400 text-white" value={editText} onChange={e => setEditText(e.target.value)} />
                                    <div className="flex gap-4">
                                        <button onClick={() => saveEdit(entry.id)} className="text-green-400 text-sm hover:underline">Сохранить</button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm hover:underline">Отмена</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-gray-300 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(entry.content) }}></div>
                                    <div className="mt-2 flex gap-4">
                                        <button onClick={() => { setEditingId(entry.id); setEditText(entry.content); }} className="text-purple-400 text-sm hover:underline">Изменить</button>
                                        <button onClick={() => deleteEntry(entry.id)} className="text-red-400 text-sm hover:underline">Удалить</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function Dynamics({ logs, testResults, gymData }: any) {
    const [testType, setTestType] = useState('schulte');
    const testTypes = [
        { id: 'schulte', label: 'Шульте (время, сек)' },
        { id: 'stroop', label: 'Струп (очки)' },
        { id: 'reaction', label: 'Реакция (мс)' },
        { id: 'tmt', label: 'Соединения (время, сек)' },
        { id: 'digitspan', label: 'Память на числа (уровень)' },
        { id: 'gonogo', label: 'Go/No-Go (очки)' }
    ];

    // Логика Корреляций
    const insights: any[] = [];
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // 1. Сон -> Фокус
    const sleepHigh = logs.filter((l: any) => l.sleep >= 7).map((l: any) => l.focus);
    const sleepLow = logs.filter((l: any) => l.sleep <= 4).map((l: any) => l.focus);
    if (sleepHigh.length > 0 && sleepLow.length > 0) {
        const diff = (avg(sleepHigh) - avg(sleepLow)).toFixed(1);
        insights.push({
            title: "Сон → Фокус",
            text: `Когда сон ≥ 7/10, фокус в среднем ${avg(sleepHigh).toFixed(1)}. Когда сон ≤ 4/10, фокус ${avg(sleepLow).toFixed(1)}.`,
            diff: `Разница: +${diff} балла!`,
            verdict: "Ложись раньше, чтобы сохранить фокус."
        });
    }

    // 2. Тренировки -> Реакция
    const gymDates = new Set(gymData.history.map((w: any) => w.date.split('T')[0]));
    const reactionGym = testResults.filter((t: any) => t.type === 'reaction' && gymDates.has(t.date.split('T')[0])).map((t: any) => t.value);
    const reactionNoGym = testResults.filter((t: any) => t.type === 'reaction' && !gymDates.has(t.date.split('T')[0])).map((t: any) => t.value);
    if (reactionGym.length > 0 && reactionNoGym.length > 0) {
        // Для реакции меньше = лучше
        const diff = (avg(reactionNoGym) - avg(reactionGym)).toFixed(0);
        insights.push({
            title: "Тренировки → Реакция",
            text: `В дни с тренировкой скорость реакции: ${avg(reactionGym).toFixed(0)} мс. В дни без: ${avg(reactionNoGym).toFixed(0)} мс.`,
            diff: `Разница: ${diff} мс!`,
            verdict: "Тренировки улучшают когнитивные функции."
        });
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Аналитика и динамика</h1>
            
            {/* Блок Корреляций */}
            {insights.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">🔍 Инсайты и Корреляции</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insights.map((ins, i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                                <h3 className="text-xl font-bold text-cyan-400 mb-2">{ins.title}</h3>
                                <p className="text-sm text-gray-300 mb-2">{ins.text}</p>
                                <p className="text-sm text-white font-bold mb-3">{ins.diff}</p>
                                <div className="flex items-start gap-2 pt-3 border-t border-[var(--border)]">
                                    <span className="text-cyan-400">🎯</span>
                                    <p className="text-sm text-gray-400">{ins.verdict}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">Состояние (Сон, Фокус, Настроение)</h2>
                <div style={{ height: '300px' }}><BigChart logs={logs.slice(-10)} /></div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl">Динамика тренировок</h2>
                    <select value={testType} onChange={e => setTestType(e.target.value)} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400 text-white">
                        {testTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                <div style={{ height: '300px' }}>
                    <TestChart results={testResults.filter((r:any) => r.type === testType)} />
                </div>
            </div>
        </div>
    );
}

// Единый график для всех тестов
function TestChart({ results }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', 
                data: { 
                    labels: results.map((r:any) => new Date(r.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})), 
                    datasets: [{ label: 'Результат', data: results.map((r:any) => r.value), borderColor: '#FF79C6', backgroundColor: 'rgba(255, 121, 198, 0.1)', tension: 0.4, fill: true }] 
                },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
    }, [results]);
    return <canvas ref={chartRef}></canvas>;
}

// --- Training ---
function Training({ setTestResults, achievements, setAchievements }: any) {
    const [tab, setTab] = useState('schulte');
    const tabs = [
        { id: 'schulte', label: 'Шульте' },
        { id: 'stroop', label: 'Струп' },
        { id: 'reaction', label: 'Реакция' },
        { id: 'trail', label: 'Соединения' },
        { id: 'digitspan', label: 'Память на числа' },
        { id: 'gonogo', label: 'Go/No-Go' },
        { id: 'nback', label: 'N-Back' }, // <--- Добавили вкладку
        { id: 'breathing', label: 'Дыхание' },
        { id: 'pomodoro', label: 'Pomodoro' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Тренировки</h1>
            <div className="flex gap-2 mb-6 flex-wrap">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} 
                        className={`px-4 py-2 rounded-lg transition ${tab === t.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            {tab === 'schulte' && <SchulteTable setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
            {tab === 'stroop' && <StroopTest setTestResults={setTestResults} />}
            {tab === 'reaction' && <ReactionTest setTestResults={setTestResults} />}
            {tab === 'trail' && <TrailMakingTest setTestResults={setTestResults} />}
            {tab === 'digitspan' && <DigitSpanTest setTestResults={setTestResults} />}
            {tab === 'gonogo' && <GoNoGoTest setTestResults={setTestResults} />}
            {tab === 'nback' && <NBackTest setTestResults={setTestResults} />} {/* <--- Добавили рендер */}
            {tab === 'breathing' && <BreathingExercise />}
            {tab === 'pomodoro' && <PomodoroTimer />}
        </div>
    );
}

function saveResult(setTestResults: any, type: string, value: number) {
    setTestResults((prev: any[]) => [...prev, { id: Date.now(), date: new Date().toISOString(), type, value }]);
}

function NBackTest({ setTestResults }: any) {
    const [phase, setPhase] = useState<'config' | 'playing' | 'finished'>('config');
    const [nLevel, setNLevel] = useState(2);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [sequence, setSequence] = useState<number[]>([]);
    const [answers, setAnswers] = useState<boolean[]>([]);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    
    const totalTrials = 20;

    const startTest = (n: number) => {
        const seq: number[] = [];
        for (let i = 0; i < totalTrials; i++) {
            if (i >= n && Math.random() < 0.3) {
                seq.push(seq[i - n]);
            } else {
                let next = Math.floor(Math.random() * 9);
                if (i >= n && next === seq[i - n]) {
                    next = (next + 1) % 9;
                }
                seq.push(next);
            }
        }
        setSequence(seq);
        setNLevel(n);
        setAnswers([]);
        setCurrentIdx(0);
        setHasAnswered(false);
        setPhase('playing');
    };

    // Игровой цикл
    useEffect(() => {
        if (phase !== 'playing') return;
        
        if (currentIdx >= totalTrials) {
            let hits = 0, correctRejections = 0;
            for (let i = 0; i < totalTrials; i++) {
                const isMatch = i >= nLevel && sequence[i] === sequence[i - nLevel];
                const userSaidMatch = answers[i] || false;
                if (isMatch && userSaidMatch) hits++;
                else if (!isMatch && !userSaidMatch) correctRejections++;
            }
            const accuracy = totalTrials > 0 ? ((hits + correctRejections) / totalTrials) * 100 : 0;
            
            setFinalAccuracy(accuracy);
            saveResult(setTestResults, 'nback', accuracy); // Твоя функция сохранения
            setPhase('finished');
            return;
        }

        setActiveCell(sequence[currentIdx]);
        setHasAnswered(false);
        
        const showTimer = setTimeout(() => setActiveCell(null), 800);
        const nextTimer = setTimeout(() => setCurrentIdx(prev => prev + 1), 1500);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(nextTimer);
        };
    }, [phase, currentIdx, sequence, nLevel, answers, setTestResults]);

    const handleMatch = () => {
        if (phase !== 'playing' || hasAnswered) return;
        setHasAnswered(true);
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIdx] = true;
            return newAnswers;
        });
    };

    // Пробел для ответа
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' && phase === 'playing') {
                e.preventDefault();
                handleMatch();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [phase, hasAnswered, currentIdx]);

    if (phase === 'finished') {
        return (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
                <h3 className="text-2xl font-bold text-white mb-4">Тест завершен!</h3>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                    {finalAccuracy.toFixed(1)}%
                </p>
                <p className="text-gray-400 mb-6 text-center">Точность рабочей памяти. Результат сохранен.</p>
                <button onClick={() => setPhase('config')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Пройти еще раз
                </button>
            </div>
        );
    }

    if (phase === 'playing') {
        return (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
                <div className="w-full max-w-md flex justify-between items-center mb-6">
                    <span className="text-gray-400 text-sm">Уровень: <span className="text-white font-bold">{nLevel}-Back</span></span>
                    <span className="text-gray-400 text-sm">Прогресс: <span className="text-white font-bold">{currentIdx} / {totalTrials}</span></span>
                </div>
                
                {/* Сетка 3x3 */}
                <div className="grid grid-cols-3 gap-3 w-64 h-64 mb-8">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`rounded-xl border border-[var(--border)] transition-all duration-150 ${activeCell === i ? 'bg-cyan-400 scale-95 shadow-lg shadow-cyan-400/50' : 'bg-[var(--bg-input)]'}`}></div>
                    ))}
                </div>

                <button 
                    onClick={handleMatch} 
                    className={`w-full max-w-md px-8 py-4 rounded-xl font-bold transition-all duration-150 ${hasAnswered ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-95' : 'bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20'}`}
                >
                    {hasAnswered ? '✓ Отмечено' : 'Совпадение! (или Space)'}
                </button>
            </div>
        );
    }

    // Экран настроек (phase === 'config')
    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <h3 className="text-2xl font-bold text-white mb-4">N-Back Тренировка</h3>
            <p className="text-gray-400 mb-6 text-center max-w-md text-sm">
                На экране будут появляться квадраты. Нажимайте кнопку, если квадрат появился в той же позиции, что и <span className="text-cyan-400 font-bold">N шагов назад</span>.
            </p>
            
            <div className="flex gap-3 mb-8">
                {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setNLevel(n)}
                        className={`w-16 h-16 rounded-xl border font-bold transition ${nLevel === n ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border)] hover:text-white'}`}>
                        {n}-Back
                    </button>
                ))}
            </div>

            <button onClick={() => startTest(nLevel)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                Начать тест
            </button>
        </div>
    );
}

function SchulteTable({ setTestResults, achievements, setAchievements }: any) {
    const [grid, setGrid] = useState<any[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [toast, setToast] = useState('');
    const timerRef = useRef<any>(null);

    const initSchulte = () => {
        const nums = Array.from({length: 25}, (_, i) => i + 1);
        for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
        setGrid(nums.map(n => ({ value: n, status: 'pending' })));
        setNextNum(1); setTime(0); setIsRunning(true); setIsStopped(false);
    };
    const stopSchulte = () => { setIsRunning(false); setIsStopped(true); setNextNum(26); };

    useEffect(() => {
        if (isRunning) timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const addAchievement = (name: string) => {
        if (!achievements.includes(name)) { setAchievements((prev:any[]) => [...prev, name]); setToast((prev:string) => prev + ` Получена ачивка: "${name}"!`); }
    };

    const handleClick = (index: number, num: number) => {
        if (!isRunning || isStopped) return;
        if (num === nextNum) {
            const newGrid = [...grid]; newGrid[index].status = 'correct'; setGrid(newGrid);
            if (nextNum === 25) {
                setIsRunning(false); const finalTime = time / 1000;
                saveResult(setTestResults, 'schulte', finalTime);
                setToast(`Готово! Время: ${finalTime.toFixed(1)} сек.`);
                if (finalTime < 30) addAchievement("Молния (<30с)");
                else if (finalTime < 45) addAchievement("Снайпер (<45с)");
                else if (finalTime < 60) addAchievement("Стабильность (<60с)");
                setTimeout(() => setToast(''), 5000);
            } else setNextNum(n => n + 1);
        } else {
            const newGrid = [...grid]; newGrid[index].status = 'error'; setGrid(newGrid);
            setTimeout(() => setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c)), 300);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">Смотрите в центр. Находите числа по порядку.</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            <div className="grid grid-cols-5 gap-2 w-[400px] h-[400px] mb-6">
                {grid.length === 0 && <div className="col-span-5 flex items-center justify-center text-gray-600">Нажмите "Начать"</div>}
                {grid.map((cell, i) => (
                    <div key={i} onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        className={`flex items-center justify-center text-2xl font-bold cursor-pointer border rounded transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            isStopped ? 'bg-white/5 border-[var(--border)] text-gray-600 cursor-not-allowed' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>{cell.value}</div>
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={initSchulte} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{time === 0 ? 'Начать' : 'Начать заново'}</button>
                <button onClick={stopSchulte} disabled={!isRunning} className={`px-8 py-3 rounded-lg font-bold border transition ${isRunning ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-gray-700 text-gray-600 cursor-not-allowed'}`}>Стоп</button>
            </div>
            {toast && <div className="mt-6 bg-green-400/10 border border-green-400 text-green-400 px-6 py-3 rounded-lg text-sm">{toast}</div>}
        </div>
    );
}

function BreathingExercise() {
    const [phase, setPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale' | 'finished'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [cycles, setCycles] = useState(0);
    const [targetCycles] = useState(4); // 4 цикла для полного расслабления

    useEffect(() => {
        if (phase === 'idle' || phase === 'finished') return;

        if (timeLeft <= 0) {
            // Переход фаз
            if (phase === 'inhale') {
                setPhase('hold');
                setTimeLeft(7);
            } else if (phase === 'hold') {
                setPhase('exhale');
                setTimeLeft(8);
            } else if (phase === 'exhale') {
                if (cycles + 1 >= targetCycles) {
                    setPhase('finished');
                } else {
                    setCycles(c => c + 1);
                    setPhase('inhale');
                    setTimeLeft(4);
                }
            }
            return;
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, phase, cycles, targetCycles]);

    const startBreathing = () => {
        setCycles(0);
        setPhase('inhale');
        setTimeLeft(4);
    };

    // Настройки анимации в зависимости от фазы
    const circleConfig = {
        inhale: { scale: 1.5, color: 'bg-cyan-400', text: 'Вдох', duration: 4000 },
        hold: { scale: 1.5, color: 'bg-blue-400', text: 'Задержи', duration: 7000 },
        exhale: { scale: 1, color: 'bg-indigo-700', text: 'Выдох', duration: 8000 },
        idle: { scale: 1, color: 'bg-gray-600', text: 'Готов?', duration: 0 },
        finished: { scale: 1, color: 'bg-green-500', text: 'Молодец!', duration: 0 }
    };

    const current = circleConfig[phase];

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center min-h-[60vh]">
            <h3 className="text-2xl font-bold text-white mb-2">Дыхание 4-7-8</h3>
            <p className="text-gray-400 mb-8 text-sm">Техника для снятия тревожности и улучшения сна. Цикл: {cycles}/{targetCycles}</p>
            
            {/* Контейнер для дыхания */}
            <div className="relative flex items-center justify-center w-72 h-72 mb-10">
                {/* Внешний статичный круг */}
                <div className="absolute w-64 h-64 rounded-full border border-[var(--border)] opacity-20"></div>
                
                {/* Анимированный круг */}
                <div 
                    className={`w-48 h-48 rounded-full ${current.color} flex flex-col items-center justify-center shadow-lg transition-all ease-in-out`}
                    style={{ 
                        transform: `scale(${current.scale})`,
                        transitionDuration: `${current.duration}ms` 
                    }}
                >
                    <span className="text-2xl font-bold text-white">{current.text}</span>
                    {phase !== 'idle' && phase !== 'finished' && (
                        <span className="text-5xl font-bold text-white/80 mt-1">{timeLeft}</span>
                    )}
                </div>
            </div>

            {phase === 'finished' ? (
                <div className="text-center">
                    <p className="text-gray-300 mb-4">Сессия завершена. Вы молодец!</p>
                    <button onClick={startBreathing} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                        Начать заново
                    </button>
                </div>
            ) : phase === 'idle' ? (
                <button onClick={startBreathing} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Начать дыхание
                </button>
            ) : (
                <button onClick={() => setPhase('finished')} className="text-gray-500 hover:text-red-400 text-sm underline">
                    Прервать сессию
                </button>
            )}
        </div>
    );
}

function StroopTest({ setTestResults }: any) {
    const colors = [
        { name: 'КРАСНЫЙ', hex: '#FF5555' },
        { name: 'ЗЕЛЕНЫЙ', hex: '#50FA7B' },
        { name: 'СИНИЙ', hex: '#8BE9FD' },
        { name: 'ЖЕЛТЫЙ', hex: '#F1FA8C' }
    ];
    const [word, setWord] = useState(colors[0]);
    const [color, setColor] = useState(colors[1]);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const timerRef = useRef<any>(null);

    const startGame = () => { setScore(0); setTime(30); setIsPlaying(true); nextRound(); };
    const nextRound = () => {
        const rndWord = colors[Math.floor(Math.random() * colors.length)];
        let rndColor = colors[Math.floor(Math.random() * colors.length)];
        while (rndColor.name === rndWord.name) rndColor = colors[Math.floor(Math.random() * colors.length)];
        setWord(rndWord); setColor(rndColor);
    };

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                setTime(t => {
                    if (t <= 1) { 
                        clearInterval(timerRef.current); 
                        setIsPlaying(false); 
                        saveResult(setTestResults, 'stroop', score); 
                        return 0; 
                    }
                    return t - 1;
                });
            }, 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isPlaying, score, setTestResults]);

    const handleAnswer = (selectedColorName: string) => {
        if (!isPlaying) return;
        if (selectedColorName === color.name) setScore(s => s + 1);
        else setScore(s => s - 1);
        nextRound();
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">Нажимайте на ЦВЕТ слова, а не на его значение.</p>
            {!isPlaying && time === 30 && <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">Начать тест (30 сек)</button>}
            
            {isPlaying && (
                <div>
                    <div className="flex gap-8 mb-8 text-2xl">
                        <div>Очки: <span className="text-cyan-400 font-bold">{score}</span></div>
                        <div>Время: <span className="text-pink-400 font-bold">{time}s</span></div>
                    </div>
                    <div className="text-7xl font-extrabold mb-10 text-center" style={{ color: color.hex }}>{word.name}</div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {colors.map(c => (
                            <button key={c.name} onClick={() => handleAnswer(c.name)} className="px-6 py-3 rounded-xl border border-[var(--border)] hover:bg-white/10 text-lg">{c.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {!isPlaying && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-4">{score}</div>
                    <div className="text-xl text-gray-300 mb-6">Ваш результат</div>
                    <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>
                </div>
            )}
        </div>
    );
}

function ReactionTest({ setTestResults }: any) {
    const [state, setState] = useState('idle');
    const [time, setTime] = useState(0);
    const startTime = useRef(0);
    const timerRef = useRef<any>(null);

    const startTest = () => {
        setState('waiting');
        setTime(0);
        const delay = Math.random() * 3000 + 2000; 
        timerRef.current = setTimeout(() => {
            setState('ready');
            startTime.current = Date.now();
        }, delay);
    };

    const handleClick = () => {
        if (state === 'idle' || state === 'result' || state === 'tooSoon') {
            startTest();
        } else if (state === 'waiting') {
            clearTimeout(timerRef.current);
            setState('tooSoon');
        } else if (state === 'ready') {
            const reactionTime = Date.now() - startTime.current;
            setTime(reactionTime);
            setState('result');
            saveResult(setTestResults, 'reaction', reactionTime);
        }
    };

    const bgClass = state === 'ready' ? 'bg-green-500' : state === 'waiting' ? 'bg-red-500' : 'bg-[var(--bg-card)]';
    const text = state === 'idle' ? 'Нажмите, чтобы начать' : 
                 state === 'waiting' ? 'Ждите зеленого...' : 
                 state === 'ready' ? 'КЛИК!' : 
                 state === 'tooSoon' ? 'Рано! Вы кликнули до зеленого цвета.' : `${time} мс`;

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Дождитесь зеленого цвета и кликните как можно быстрее.</p>
            <div onClick={handleClick} className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] transition-colors ${bgClass}`}>
                <span className="text-3xl font-bold text-white text-center px-4">{text}</span>
            </div>
            {state === 'result' && (
                <button onClick={startTest} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Попробовать еще раз
                </button>
            )}
        </div>
    );
}

function TrailMakingTest({ setTestResults }: any) {
    const targets = ['1','А','2','Б','3','В','4','Г','5','Д','6','Е','7','Ж','8','З'];
    const [grid, setGrid] = useState<any[]>([]);
    const [nextIndex, setNextIndex] = useState(0);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const timerRef = useRef<any>(null);

    const initGame = () => {
        const shuffled = [...targets].sort(() => Math.random() - 0.5);
        setGrid(shuffled.map(t => ({ value: t, status: 'pending' })));
        setNextIndex(0);
        setTime(0);
        setIsRunning(true);
        setIsFinished(false);
    };

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const handleClick = (index: number, value: string) => {
        if (!isRunning) return;
        const expectedValue = targets[nextIndex];
        
        if (value === expectedValue) {
            const newGrid = [...grid];
            newGrid[index].status = 'correct';
            setGrid(newGrid);
            
            if (nextIndex === targets.length - 1) {
                setIsRunning(false);
                setIsFinished(true);
                saveResult(setTestResults, 'tmt', time / 1000);
            } else {
                setNextIndex(prev => prev + 1);
            }
        } else {
            const newGrid = [...grid];
            newGrid[index].status = 'error';
            setGrid(newGrid);
            setTimeout(() => {
                setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c));
            }, 300);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4 text-center">Кликайте по очереди: 1 → А → 2 → Б → 3 и т.д.</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            
            {!isRunning && !isFinished && (
                <button onClick={initGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">Начать тест</button>
            )}
            
            {isFinished && (
                <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-green-400 mb-2">Готово!</div>
                    <div className="text-xl text-gray-300">Ваше время: {(time / 1000).toFixed(1)} сек</div>
                    <button onClick={initGame} className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Заново</button>
                </div>
            )}

            <div className="grid grid-cols-4 gap-3 w-full max-w-md">
                {grid.map((cell, i) => (
                    <div key={i} onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        className={`h-20 flex items-center justify-center text-2xl font-bold cursor-pointer border rounded-lg transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>
                        {cell.value}
                    </div>
                ))}
            </div>
        </div>
    );
}

function DigitSpanTest({ setTestResults }: any) {
    const [level, setLevel] = useState(3);
    const [phase, setPhase] = useState('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [input, setInput] = useState('');
    const [currentIdx, setCurrentIdx] = useState(-1);
    const [message, setMessage] = useState('Нажмите "Начать"');
    const timerRef = useRef<any>(null);

    const startLevel = (lvl: number) => {
        const seq = Array.from({ length: lvl }, () => Math.floor(Math.random() * 10));
        setSequence(seq);
        setInput('');
        setPhase('showing');
        setMessage('Запоминайте...');
        
        let idx = 0;
        const showNext = () => {
            setCurrentIdx(idx);
            idx++;
            if (idx < seq.length) {
                timerRef.current = setTimeout(showNext, 800);
            } else {
                timerRef.current = setTimeout(() => {
                    setPhase('input');
                    setMessage('Введите последовательность');
                    setCurrentIdx(-1);
                }, 800);
            }
        };
        timerRef.current = setTimeout(showNext, 1000);
    };

    const checkAnswer = () => {
        const correct = sequence.join('');
        if (input === correct) {
            setMessage(`Верно! Переходим на уровень ${level + 1}.`);
            setPhase('result');
            saveResult(setTestResults, 'digitspan', level);
            setLevel(l => l + 1);
        } else {
            setMessage(`Неверно. Было: ${correct}. Начинаем заново с 3.`);
            setPhase('result');
            if(level > 3) saveResult(setTestResults, 'digitspan', level - 1);
            setLevel(3);
        }
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Запомните последовательность чисел и введите её в правильном порядке.</p>
            <div className="text-xl text-cyan-400 mb-6">Уровень: {level}</div>
            
            <div className="w-full max-w-md h-32 flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] mb-8">
                {phase === 'showing' && currentIdx >= 0 ? (
                    <span className="text-7xl font-bold text-white">{sequence[currentIdx]}</span>
                ) : (
                    <span className="text-xl text-gray-400">{message}</span>
                )}
            </div>

            {phase === 'input' && (
                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-2xl outline-none focus:border-cyan-400 text-white tracking-widest"
                        autoFocus
                    />
                    <button onClick={checkAnswer} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg w-full">Проверить</button>
                </div>
            )}

            {(phase === 'idle' || phase === 'result') && (
                <button onClick={() => startLevel(level)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    {phase === 'idle' ? 'Начать' : 'Продолжить'}
                </button>
            )}
        </div>
    );
}

function GoNoGoTest({ setTestResults }: any) {
    const [phase, setPhase] = useState('idle');
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [stimulus, setStimulus] = useState('none');
    const timerRef = useRef<any>(null);
    const stimulusRef = useRef<any>(null);

    const startGame = () => {
        setScore(0);
        setTime(30);
        setPhase('playing');
        nextStimulus();
    };

    const nextStimulus = () => {
        setStimulus('none');
        const delay = Math.random() * 1000 + 800;
        stimulusRef.current = setTimeout(() => {
            const type = Math.random() < 0.75 ? 'go' : 'nogo';
            setStimulus(type);
            
            stimulusRef.current = setTimeout(() => {
                if (type === 'go') {
                    setScore(s => s - 1); // Пропустил зеленый
                }
                nextStimulus();
            }, 1200);
        }, delay);
    };

    const handleClick = () => {
        if (phase !== 'playing') return;
        if (stimulus === 'go') {
            setScore(s => s + 1);
            clearTimeout(stimulusRef.current);
            nextStimulus();
        } else if (stimulus === 'nogo') {
            setScore(s => s - 2); // Нажал красный
            setStimulus('error');
            clearTimeout(stimulusRef.current);
            setTimeout(() => nextStimulus(), 500);
        }
    };

    useEffect(() => {
        if (phase === 'playing') {
            timerRef.current = setInterval(() => {
                setTime(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        clearTimeout(stimulusRef.current);
                        setPhase('gameover');
                        setStimulus('none');
                        saveResult(setTestResults, 'gonogo', score);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => {
            clearInterval(timerRef.current);
            clearTimeout(stimulusRef.current);
        };
    }, [phase, score, setTestResults]);

    // Классы для круга в центре
    const circleClass = stimulus === 'go' ? 'bg-green-500' : 
                        stimulus === 'nogo' ? 'bg-red-500' : 
                        stimulus === 'error' ? 'bg-red-700 border-4 border-red-300' :
                        'bg-transparent';

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Кликайте только на <span className="text-green-400 font-bold">зеленый</span> круг. При <span className="text-red-400 font-bold">красном</span> не нажимайте ничего!</p>
            
            {phase === 'playing' && (
                <div className="flex gap-8 mb-8 text-2xl">
                    <div>Очки: <span className="text-cyan-400 font-bold">{score}</span></div>
                    <div>Время: <span className="text-pink-400 font-bold">{time}s</span></div>
                </div>
            )}

            <div onClick={handleClick} className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] bg-[var(--bg-card)] transition-colors duration-150 ${phase !== 'playing' ? 'cursor-default' : ''}`}>
                {phase === 'idle' && <span className="text-3xl font-bold text-white">Нажмите "Старт"</span>}
                {phase === 'gameover' && (
                    <div className="text-center">
                        <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                        <div className="text-xl text-gray-300">Ваш результат</div>
                    </div>
                )}
                {phase === 'playing' && stimulus === 'none' && <span className="text-3xl font-bold text-white opacity-0">...</span>}
                {phase === 'playing' && (stimulus === 'go' || stimulus === 'nogo' || stimulus === 'error') && (
                    <div className={`w-40 h-40 rounded-full transition-all duration-100 flex items-center justify-center ${circleClass}`}>
                        {stimulus === 'error' && <span className="text-3xl font-bold text-white">ОЙ!</span>}
                    </div>
                )}
            </div>

            {phase === 'idle' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Старт</button>}
            {phase === 'gameover' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>}
        </div>
    );
}

function PomodoroTimer() {
    const workDurations = [5, 10, 15, 20, 25, 30];
    const [workTime, setWorkTime] = useState(25);
    const [mode, setMode] = useState('work');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<any>(null);
    const changeDuration = (mins: number) => { setIsRunning(false); setMode('work'); setWorkTime(mins); setTimeLeft(mins * 60); };

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) { clearInterval(timerRef.current); setIsRunning(false); const nextMode = mode === 'work' ? 'break' : 'work'; setMode(nextMode); return nextMode === 'work' ? workTime * 60 : 5 * 60; }
                    return t - 1;
                });
            }, 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isRunning, mode, workTime]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
                {workDurations.map(m => (
                    <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-1 rounded-lg text-sm transition ${workTime === m && mode === 'work' ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-[var(--border)]'}`}>{m} мин</button>
                ))}
            </div>
            <div className={`text-2xl mb-4 font-semibold ${mode === 'work' ? 'text-cyan-400' : 'text-green-400'}`}>{mode === 'work' ? 'Время фокусироваться' : 'Перерыв'}</div>
            <div className="text-8xl font-bold mb-8 tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
            <div className="flex gap-4">
                <button onClick={() => setIsRunning(!isRunning)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{isRunning ? 'Пауза' : 'Старт'}</button>
                <button onClick={() => { setIsRunning(false); setMode('work'); setTimeLeft(workTime * 60); }} className="border border-[var(--border)] text-gray-400 px-8 py-3 rounded-lg hover:bg-white/5">Сброс</button>
            </div>
            <input type="text" placeholder="Введите ОДНУ задачу сюда..." className="mt-8 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 w-full max-w-md text-center text-lg outline-none focus:border-cyan-400" />
        </div>
    );
}
// --- Knowledge Base (Полноценная база знаний) ---
function Knowledge() {
    const articles = [
        { id: 1, tag: 'Быт', title: 'Правило 2 минут', content: 'Если задача занимает меньше 2 минут (ответить на сообщение, помыть чашку) — сделай её прямо сейчас. Это предотвращает накопление микро-задач, которые перегружают рабочую память.' },
        { id: 2, tag: 'Работа', title: 'Тайм-блокинг вместо списка дел', content: 'Людям с СДВГ сложно оценивать время. Вместо списка "что сделать", выделяй в календаре конкретные блоки времени на задачи. "С 14:00 до 15:00 я пишу отчет", а не просто "Написать отчет".' },
        { id: 3, tag: 'Медицина', title: 'Дофамин и СДВГ', content: 'При СДВГ уровень дофамина нестабилен. Мозг ищет быструю стимуляцию (соцсети, сладкое). Заменяйте дешевый дофамин на качественный: спорт, обучение новому, сложные задачи, которые вызывают интерес.' },
        { id: 4, tag: 'Фокус', title: 'Внешний мозг', content: 'Не держи мысли в голове. Записывай всё: в GeQu, в блокнот, на стикеры. Голова человека с СДВГ — это место для создания идей, а не для их хранения.' },
        { id: 5, tag: 'Быт', title: 'Сенсорная перегрузка', content: 'Если чувствуешь, что закипаешь от звуков/света/мыслей — это перегрузка. Уйди в темное тихое место на 10 минут. Закрой глаза. Это не лень, это перезагрузка нервной системы.' },
        { id: 6, tag: 'Работа', title: 'Правило 5 минут', content: 'Договоритесь с собой поработать над задачей всего 5 минут. Часто этого хватает, чтобы преодолеть барьер старта (сопротивление дофаминовой системы).' },
        { id: 7, tag: 'Фокус', title: 'Pomodoro для СДВГ', content: 'Классический таймер 25/5 работает не для всех. Если вам нужно больше времени для разгона, попробуйте 45/15. Главное — физический таймер, который возвращает в реальность из гиперфокуса.' },
        { id: 8, tag: 'Медицина', title: 'Эмоциональная дисрегуляция', content: 'RSD (Rejection Sensitive Dysphoria) — крайняя чувствительность к отвержению или критике. Это физиологическая особенность СДВГ. Знание этого помогает не винить себя за резкие эмоции.' }
    ];
    const [filter, setFilter] = useState('Все');
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);
    const tags = ['Все', 'Быт', 'Работа', 'Медицина', 'Фокус'];

    const filtered = articles.filter(a => (filter === 'Все' || a.tag === filter) && (a.title.toLowerCase().includes(search.toLowerCase()) || a.content.toLowerCase().includes(search.toLowerCase())));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">База знаний</h1>
            <div className="glass-card p-6 rounded-2xl mb-6">
                <input type="text" placeholder="Поиск по статьям..." value={search} onChange={e => setSearch(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-cyan-400 mb-4" />
                <div className="flex gap-2 flex-wrap">
                    {tags.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-4 py-1 rounded-full text-sm transition ${filter === t ? 'bg-purple-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{t}</button>)}
                </div>
            </div>
            <div className="space-y-4">
                {filtered.map(art => (
                    <div key={art.id} className="glass-card rounded-2xl overflow-hidden">
                        <div onClick={() => setOpenId(openId === art.id ? null : art.id)} className="p-6 cursor-pointer flex justify-between items-center hover:bg-white/5 transition">
                            <div>
                                <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded mr-3">{art.tag}</span>
                                <span className="text-xl text-white">{art.title}</span>
                            </div>
                            <span className="text-gray-500">{openId === art.id ? '▲' : '▼'}</span>
                        </div>
                        {openId === art.id && (
                            <div className="px-6 pb-6 text-gray-300 leading-relaxed border-t border-[var(--border)] pt-4">
                                {art.content}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- About ADHD (Меню раздела) ---
function AboutAdhd() {
    const [view, setView] = useState('info');
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Про СДВГ</h1>
            <div className="flex gap-4 mb-6">
                <button onClick={() => setView('info')} className={`px-4 py-2 rounded-lg transition ${view === 'info' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>Что это такое?</button>
                <button onClick={() => setView('test')} className={`px-4 py-2 rounded-lg transition ${view === 'test' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>Клинический тест</button>
            </div>
            {view === 'info' ? <AdhdInfo /> : <AdhdTest />}
        </div>
    );
}
// --- About ADHD (Информация) ---
function AdhdInfo() {
    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Что такое СДВГ у взрослых?</h2>
                <p className="text-gray-300 leading-relaxed mb-3">
                    Синдром дефицита внимания и гиперактивности (СДВГ) — это нейробиологическое расстройство, которое характеризуется трудностями с концентрацией внимания, импульсивностью и, в некоторых случаях, гиперактивностью. 
                    Вопреки мифу, это не просто "детская болезнь". У 60-70% детей с СДВГ симптомы сохраняются и во взрослом возрасте.
                </p>
                <p className="text-gray-300 leading-relaxed">
                    Мозг человека с СДВГ работает иначе: у него наблюдается дефицит дофамина и норадреналина (нейромедиаторов, отвечающих за мотивацию, контроль импульсов и чувство удовлетворения). Это не вопрос лени или слабой воли, это физиологическая особенность.
                </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Основные симптомы и проявления</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xl text-white mb-2">Невнимательность</h3>
                        <ul className="list-disc list-inside text-gray-400 space-y-1">
                            <li>Трудности с удержанием внимания на скучных или рутинных задачах.</li>
                            <li>Постоянное откладывание дел (прокрастинация).</li>
                            <li>Забывчивость: потеря ключей, телефонов, забытые обещания.</li>
                            <li>Потеря нити разговора, "отключение" посреди беседы.</li>
                            <li>Сложности с организацией времени и пространства (беспорядок).</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl text-white mb-2">Импульсивность и Гиперактивность</h3>
                        <ul className="list-disc list-inside text-gray-400 space-y-1">
                            <li>Нетерпеливость: трудно ждать своей очереди.</li>
                            <li>Перебивание собеседника, выпаливание ответа до конца вопроса.</li>
                            <li>Внутреннее беспокойство (ощущение "заведенного мотора").</li>
                            <li>Склонность к рискованным действиям (быстрая езда, импульсивные покупки).</li>
                            <li>Сложности с фильтрацией мыслей (говорю всё, что приходит в голову).</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-pink-400 mb-4">Как СДВГ влияет на жизнь?</h2>
                <div className="space-y-4 text-gray-300">
                    <p><span className="text-white font-semibold">Работа и учеба:</span> Трудности с долгосрочными проектами, частая смена работы из-за скуки или конфликтов с начальством, "горение" дедлайнами (синдром студента: делают всё за ночь до сдачи).</p>
                    <p><span className="text-white font-semibold">Отношения:</span> Эмоциональные качели (RSD — отверженная чувствительная дисфория), внезапные вспышки гнева или слез. Партнеру может казаться, что человек с СДВГ его не слушает или не ценит.</p>
                    <p><span className="text-white font-semibold">Быт и финансы:</span> Накопление хлама (синдром Диогена в легкой форме), неоплаченные вовремя счета, импульсивные траты, забытые на плите кастрюли.</p>
                    <p><span className="text-white font-semibold">Психическое здоровье:</span> Частые спутники СДВГ — тревожность, депрессия, нарушения сна и зависимости (алкоголь, игры, соцсети), так как мозг ищет быстрый дофамин.</p>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">СДВГ — это не приговор</h2>
                <p className="text-gray-300 leading-relaxed">
                    При правильном подходе (медикаменты, когнитивно-поведенческая терапия, структуры и привычки) люди с СДВГ могут достигать невероятных высот. Креативность, способность к гиперфокусу на интересных задачах, нестандартное мышление и энергия — это суперсилы, которые идут в комплекте с СДВГ. Главное — научиться управлять своими "слабыми местами".
                </p>
            </div>
        </div>
    );
}

// --- ADHD Screening Test (Полный тест ASRS) ---
function AdhdTest() {
    const questions = [
        "Как часто вам трудно доводить до конца детали проекта, после того как вы уже справились с самыми сложными его частями?",
        "Как часто вам трудно организовать выполнение задачи или деятельности?",
        "Как часто вы забываете о назначенных встречах или обязательствах?",
        "Как часто вы избегаете, откладываете или оттягиваете начало выполнения задач, требующих больших умственных усилий?",
        "Как часто вы ерзаете руками или ногами, когда вам приходится сидеть долгое время?",
        "Как часто вы чувствуете себя слишком активным и нуждаетесь в том, чтобы что-то делать, как будто вас «заводит мотор»?",
        "Как часто вы совершаете ошибки по невнимательности, когда выполняете скучную или повторяющуюся работу?",
        "Как часто вам трудно сконцентрироваться на том, что вам говорят, даже когда вы слушаете напрямую?",
        "Как часто вам трудно запоминать, куда вы положили вещи (ключи, кошелек, телефон)?",
        "Как часто вас отвлекают посторонние звуки или шумы?",
        "Как часто вы встаете и ходите в ситуациях, когда ожидается, что вы будете сидеть на месте?",
        "Как часто вы чувствуете беспокойство или суетливость?",
        "Как часто вам трудно расслабиться, даже когда у вас есть свободное время?",
        "Как часто вы обнаруживаете, что разговариваете слишком много, когда находитесь в социальной ситуации?",
        "Как часто вы перебиваете других, когда они заняты?",
        "Как часто вы чувствуете, что вам трудно дождаться своей очереди в ситуациях, когда это необходимо?",
        "Как часто вы вторгаетесь в разговор или деятельность других людей?",
        "Как часто вы теряете нить разговора, когда кто-то говорит с вами?"
    ];
    const options = [
        { text: "Никогда", val: 0 },
        { text: "Редко", val: 1 },
        { text: "Иногда", val: 2 },
        { text: "Часто", val: 3 },
        { text: "Очень часто", val: 4 }
    ];

    const [answers, setAnswers] = useState<any[]>(Array(18).fill(null));
    const [result, setResult] = useState<any>(null);

    const handleAnswer = (qIndex: number, val: number) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = val;
        setAnswers(newAnswers);
    };

    const calculateResult = () => {
        const total = answers.reduce((sum, val) => sum + val, 0);
        const maxScore = 18 * 4;
        const percent = Math.round((total / maxScore) * 100);
        let verdict = "";
        
        const partA = answers.slice(0, 6).filter(v => v >= 3).length;
        
        if (partA >= 4 || percent >= 60) {
            verdict = "Высокая вероятность СДВГ. Ваши ответы сильно соответствуют клинической картине. Рекомендуется обратиться к врачу-психиатру для точной диагностики.";
        } else if (percent >= 35) {
            verdict = "Умеренная вероятность СДВГ. У вас есть ряд симптомов, которые могут мешать жизни. Стоит внимательнее прислушаться к себе и, возможно, проконсультироваться со специалистом.";
        } else {
            verdict = "Низкая вероятность СДВГ. Скорее всего, ваши трудности с вниманием вызваны другими факторами (стресс, усталость, информационный перегруз).";
        }
        setResult({ score: total, percent, verdict });
    };

    return (
        <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Тест на СДВГ (ASRS-v1.1)</h2>
            <p className="text-gray-400 mb-6">Шкала скрининга СДВГ у Всемирной организации здравоохранения. Ответьте на 18 вопросов честно, основываясь на вашем поведении за последние 6 месяцев.</p>
            
            {!result ? (
                <div className="space-y-6">
                    {questions.map((q, i) => (
                        <div key={i} className="border-b border-[var(--border)] pb-4">
                            <p className="text-gray-300 mb-3">{i+1}. {q}</p>
                            <div className="flex flex-wrap gap-2">
                                {options.map(opt => (
                                    <button key={opt.val} onClick={() => handleAnswer(i, opt.val)}
                                        className={`px-4 py-2 rounded-lg text-sm border transition ${
                                            answers[i] === opt.val ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400' : 'border-[var(--border)] text-gray-400 hover:border-gray-500'
                                        }`}>{opt.text}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={calculateResult} disabled={answers.includes(null)}
                        className={`w-full font-bold py-3 rounded-lg transition ${answers.includes(null) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black hover:opacity-90'}`}>
                        {answers.includes(null) ? `Ответьте на все вопросы (${answers.filter(a => a !== null).length}/18)` : 'Узнать результат'}
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <div className="text-6xl font-bold text-cyan-400 mb-2">{result.percent}%</div>
                    <div className="text-xl text-gray-300 mb-6">Вероятность наличия симптомов СДВГ</div>
                    <div className={`p-6 rounded-xl mb-6 text-left ${result.percent >= 60 ? 'bg-red-500/10 border border-red-500/30' : result.percent >= 35 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                        <p className="text-gray-200 text-lg">{result.verdict}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">* Данный тест является скрининговым и не ставит медицинский диагноз. Для точной диагностики обратитесь к врачу-психиатру.</p>
                    <button onClick={() => { setResult(null); setAnswers(Array(18).fill(null)); }} className="border border-cyan-400 text-cyan-400 px-6 py-2 rounded-lg hover:bg-cyan-400/10">
                        Пройти заново
                    </button>
                </div>
            )}
        </div>
    );
}

function Settings({ diary, logs }: any) {
    const exportTxt = () => { 
        let text = "=== Дневник GeQu ===\n\n"; 
        diary.forEach((d:any) => { text += `${new Date(d.date).toLocaleString('ru-RU')}\n${d.content}\n--------------------\n\n`; }); 
        downloadFile(text, "gequ_diary.txt", "text/plain"); 
    };
    
    const exportCsv = () => { 
        let csv = "Дата,Сон,Фокус,Настроение,Помогло,Мешало,Событие\n"; 
        logs.forEach((l:any) => { 
            const helped = l.helped ? l.helped.join('; ') : '';
            const hindered = l.hindered ? l.hindered.join('; ') : '';
            csv += `${new Date(l.date).toLocaleString('ru-RU')},${l.sleep},${l.focus},${l.mood},"${helped}","${hindered}","${l.mainEvent || ''}"\n`; 
        }); 
        downloadFile(csv, "gequ_logs.csv", "text/csv;charset=utf-8;"); 
    };
    
    const downloadFile = (content: string, fileName: string, mimeType: string) => { 
        const blob = new Blob([content], { type: mimeType }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = fileName; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
    };

    const exportAllData = () => {
        const backup: any = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('gequ_')) {
                backup[key] = localStorage.getItem(key);
            }
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gequ_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importAllData = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('gequ_')) {
                        localStorage.setItem(key, data[key]);
                    }
                });
                alert("Данные успешно загружены! Страница будет перезагружена.");
                window.location.reload();
            } catch (err) {
                alert("Ошибка чтения файла. Убедитесь, что это резервная копия GeQu.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Настройки и данные</h1>
            
            <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/30 bg-cyan-400/5">
                <h2 className="text-xl mb-2 text-cyan-400">Резервное копирование (Всё приложение)</h2>
                <p className="text-gray-400 mb-4 text-sm">Сохраните все данные (Дневник, Тесты, Спортзал, Привычки) в один файл или загрузите из файла для переноса на другое устройство.</p>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportAllData} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Выгрузить всё (JSON)</button>
                    <label className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg cursor-pointer">
                        Загрузить из файла
                        <input type="file" accept=".json" onChange={importAllData} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl mb-4">Экспорт отдельных данных</h2>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportTxt} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Дневник (.txt)</button>
                    <button onClick={exportCsv} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Логи дней (.csv)</button>
                </div>
            </div>
        </div>
    );
}

// ================= СПОРТЗАЛ (ФАЗА 3) =================
function GymApp({ gymData, setGymData, logs }: any) {
    const [view, setView] = useState('home');
    const [activeWorkout, setActiveWorkout] = useState<any>(null);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);

    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);

    const startWorkout = (day: any) => {
        const lastHistory = [...gymData.history].reverse().find((h: any) => h.dayId === day.id);
        const exercises = day.exercises.map((ex: any) => {
            const lastEx = lastHistory?.exercises.find((e: any) => e.name === ex.name);
            const sets = Array.from({ length: ex.sets }).map((_, i) => ({
                weight: parseFloat(lastEx?.sets[i]?.weight) || 0,
                reps: parseInt(lastEx?.sets[i]?.reps) || parseInt(ex.reps.split('-')[0]) || 0,
                done: false
            }));
            return { name: ex.name, muscle: ex.muscle, sets };
        });

        setActiveWorkout({
            id: Date.now(),
            dayId: day.id,
            dayName: day.name,
            date: new Date().toISOString(),
            exercises,
            startTime: Date.now(),
            endTime: null
        });
        setView('active');
    };

    const finishWorkout = () => {
        if (activeWorkout) {
            activeWorkout.endTime = Date.now();
            const updatedHistory = [...gymData.history, activeWorkout];
            setGymData({ ...gymData, history: updatedHistory });
        }
        setActiveWorkout(null);
        setView('history');
    };

    const saveEditedWorkout = (updated: any) => {
        const newHistory = gymData.history.map((w: any) => 
            (w.id || w.date) === (updated.id || updated.date) ? updated : w
        );
        setGymData({ ...gymData, history: newHistory });
        setEditingWorkout(null);
    };

    if (view === 'active' && activeWorkout) {
        return <ActiveWorkoutView activeWorkout={activeWorkout} setActiveWorkout={setActiveWorkout} finishWorkout={finishWorkout} isEditing={false} />;
    }

    if (editingWorkout) {
        return <ActiveWorkoutView activeWorkout={editingWorkout} setActiveWorkout={setEditingWorkout} finishWorkout={saveEditedWorkout} isEditing={true} />;
    }

    const tabs = [
        { id: 'home', label: 'Главная' },
        { id: 'programs', label: 'Программы' },
        { id: 'history', label: 'История' },
        { id: 'calendar', label: 'Календарь' },
        { id: 'balance', label: 'Баланс' },
        { id: 'pr', label: 'Рекорды' },
        { id: 'ai', label: 'ИИ-Тренер' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Спортзал</h1>
            <div className="flex gap-2 mb-8 border-b border-[var(--border)] pb-2 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setView(t.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${view === t.id ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-400 hover:bg-white/5'}`}>{t.label}</button>
                ))}
            </div>

            {view === 'home' && <GymHome activeProgram={activeProgram} gymData={gymData} startWorkout={startWorkout} setView={setView} />}
            {view === 'programs' && <GymPrograms gymData={gymData} setGymData={setGymData} />}
            {view === 'history' && <GymHistory gymData={gymData} setGymData={setGymData} setEditingWorkout={setEditingWorkout} />}
            {view === 'calendar' && <GymCalendar gymData={gymData} />}
            {view === 'balance' && <GymMuscleBalance gymData={gymData} />}
            {view === 'pr' && <GymPRs gymData={gymData} />}
            {view === 'ai' && <GymAI gymData={gymData} logs={logs} />}
        </div>
    );
}

function GymHome({ activeProgram, gymData, startWorkout, setView }: any) {
    if (!activeProgram) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center">
                <p className="text-xl text-gray-300 mb-4">У вас нет активной программы.</p>
                <button onClick={() => setView('programs')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Создать программу</button>
            </div>
        );
    }

    const lastWorkout = gymData.history[gymData.history.length - 1];
    const todayDay = activeProgram.days[0]; 

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p className="text-gray-400 text-sm">Текущая программа</p>
                        <h2 className="text-2xl font-bold text-white">{activeProgram.name}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">Всего тренировок</p>
                        <p className="text-2xl font-bold text-cyan-400">{gymData.history.length}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                    <p className="text-gray-400 text-sm mb-1">Сегодня:</p>
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">{todayDay?.name || "Отдых"}</h3>
                    {todayDay && (
                        <button onClick={() => startWorkout(todayDay)} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg">
                            Начать тренировку
                        </button>
                    )}
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <p className="text-gray-400 text-sm mb-1">Последняя:</p>
                    <h3 className="text-xl font-bold text-white mb-2">{lastWorkout ? lastWorkout.dayName : "Нет данных"}</h3>
                    <p className="text-gray-400 text-sm">{lastWorkout ? new Date(lastWorkout.date).toLocaleDateString('ru-RU') : "—"}</p>
                </div>
            </div>
        </div>
    );
}

function GymPrograms({ gymData, setGymData }: any) {
    const [editingProgram, setEditingProgram] = useState<any>(null);

    const createProgram = () => {
        const newProgram = { id: Date.now(), name: "Новая программа", days: [] };
        setGymData({ ...gymData, programs: [...gymData.programs, newProgram], activeProgramId: newProgram.id });
        setEditingProgram(newProgram);
    };

    const deleteProgram = (id: number) => {
        if (confirm("Удалить программу навсегда?")) {
            const newPrograms = gymData.programs.filter((p: any) => p.id !== id);
            const newActiveId = gymData.activeProgramId === id ? (newPrograms[0]?.id || null) : gymData.activeProgramId;
            setGymData({ ...gymData, programs: newPrograms, activeProgramId: newActiveId });
        }
    };

    if (editingProgram) {
        const program = gymData.programs.find((p: any) => p.id === editingProgram.id);
        return <ProgramEditor program={program} gymData={gymData} setGymData={setGymData} setEditingProgram={setEditingProgram} />;
    }

    return (
        <div>
            <button onClick={createProgram} className="mb-6 bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg">+ Создать программу</button>
            <div className="space-y-4">
                {gymData.programs.map((p: any) => (
                    <div key={p.id} className="glass-card p-6 rounded-2xl flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white">{p.name}</h3>
                            <p className="text-gray-400 text-sm">{p.days.length} дней</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setGymData({ ...gymData, activeProgramId: p.id })} className={`px-4 py-2 rounded-lg text-sm ${gymData.activeProgramId === p.id ? 'bg-green-400/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>{gymData.activeProgramId === p.id ? 'Активна' : 'Сделать активной'}</button>
                            <button onClick={() => setEditingProgram(p)} className="px-4 py-2 rounded-lg text-sm bg-purple-400/20 text-purple-400">Ред.</button>
                            <button onClick={() => deleteProgram(p.id)} className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400">Удалить</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ProgramEditor({ program, gymData, setGymData, setEditingProgram }: any) {
    const addDay = () => {
        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: [...p.days, { id: Date.now(), name: "День " + (p.days.length + 1), exercises: [] }] } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    const addExercise = (dayId: number) => {
        const exName = prompt("Название упражнения:");
        if (!exName) return;
        const muscle = prompt("Мышечная группа (Грудь, Спина, Ноги):") || "—";
        const sets = parseInt(prompt("Кол-во подходов:", "4")) || 4;
        const reps = prompt("Диапазон повторений:", "8-12") || "8-12";

        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: p.days.map((d: any) => d.id === dayId ? { ...d, exercises: [...d.exercises, { id: Date.now(), name: exName, muscle, sets, reps }] } : d) } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    const deleteDay = (dayId: number) => {
        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: p.days.filter((d: any) => d.id !== dayId) } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <input type="text" value={program.name} onChange={e => setGymData({ ...gymData, programs: gymData.programs.map((p:any) => p.id === program.id ? {...p, name: e.target.value} : p) })} className="bg-transparent text-2xl font-bold text-white border-b border-[var(--border)] outline-none focus:border-cyan-400" />
                <button onClick={() => setEditingProgram(null)} className="text-gray-400 hover:text-white">← Назад</button>
            </div>

            <div className="space-y-6">
                {program.days.map((day: any) => (
                    <div key={day.id} className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <input type="text" value={day.name} onChange={e => setGymData({ ...gymData, programs: gymData.programs.map((p:any) => p.id === program.id ? {...p, days: p.days.map((d:any) => d.id === day.id ? {...d, name: e.target.value} : d)} : p) })} className="bg-transparent text-xl font-bold text-cyan-400 border-b border-[var(--border)] outline-none" />
                            <button onClick={() => deleteDay(day.id)} className="text-red-400 text-sm">Удалить день</button>
                        </div>
                        <div className="space-y-2 mb-4">
                            {day.exercises.map((ex: any) => (
                                <div key={ex.id} className="bg-[var(--bg-input)] p-3 rounded-lg flex justify-between items-center">
                                    <div><span className="text-white font-medium">{ex.name}</span> <span className="text-gray-400 text-sm">({ex.muscle})</span></div>
                                    <span className="text-gray-300 text-sm">{ex.sets} × {ex.reps}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => addExercise(day.id)} className="w-full border border-dashed border-[var(--border)] text-gray-400 py-2 rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition">+ Упражнение</button>
                    </div>
                ))}
            </div>
            <button onClick={addDay} className="mt-6 w-full bg-white/5 text-white font-bold py-3 rounded-lg border border-[var(--border)]">+ Добавить день</button>
        </div>
    );
}

function ActiveWorkoutView({ activeWorkout, setActiveWorkout, finishWorkout, isEditing }: any) {
    const [activeExIdx, setActiveExIdx] = useState(0);
    const exercise = activeWorkout.exercises[activeExIdx];

    const updateSet = (setIdx: number, field: string, value: any) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx][field] = value;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const toggleDone = (setIdx: number) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx].done = !newExercises[activeExIdx].sets[setIdx].done;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const changeWeight = (setIdx: number, delta: number) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx].weight = parseFloat((newExercises[activeExIdx].sets[setIdx].weight + delta).toFixed(2));
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{activeWorkout.dayName} {isEditing && <span className="text-purple-400 text-sm">(Редактирование)</span>}</h1>
                    <p className="text-gray-400 text-sm">{new Date(activeWorkout.date).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex gap-2">
                    {isEditing && <button onClick={() => finishWorkout(activeWorkout)} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg">Отмена</button>}
                    <button onClick={() => finishWorkout(activeWorkout)} className="bg-green-400 text-black font-bold px-6 py-3 rounded-lg">{isEditing ? "Сохранить" : "Завершить"}</button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {activeWorkout.exercises.map((ex: any, i: number) => (
                    <button key={i} onClick={() => setActiveExIdx(i)} className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${i === activeExIdx ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400'}`}>
                        {ex.name}
                    </button>
                ))}
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-cyan-400 mb-4">{exercise.name} <span className="text-gray-400 text-sm">({exercise.muscle})</span></h2>
                
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2 px-2">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4 text-center">Вес (кг)</div>
                    <div className="col-span-4 text-center">Повторения</div>
                    <div className="col-span-3 text-center">Готово</div>
                </div>

                <div className="space-y-3">
                    {exercise.sets.map((set: any, idx: number) => (
                        <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${set.done ? 'bg-green-500/10' : 'bg-[var(--bg-input)]'}`}>
                            <div className="col-span-1 text-center text-gray-400">{idx + 1}</div>
                            <div className="col-span-4 flex items-center gap-1">
                                <button onClick={() => changeWeight(idx, -2.5)} className="bg-red-500/20 text-red-400 w-8 h-8 rounded-md font-bold">-</button>
                                <input type="number" value={set.weight} onChange={e => updateSet(idx, 'weight', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border border-[var(--border)] rounded-md p-2 text-center text-white" />
                                <button onClick={() => changeWeight(idx, 2.5)} className="bg-green-500/20 text-green-400 w-8 h-8 rounded-md font-bold">+</button>
                            </div>
                            <div className="col-span-4">
                                <input type="number" value={set.reps} onChange={e => updateSet(idx, 'reps', parseInt(e.target.value) || 0)} className="w-full bg-transparent border border-[var(--border)] rounded-md p-2 text-center text-white" />
                            </div>
                            <div className="col-span-3 flex justify-center">
                                <button onClick={() => toggleDone(idx)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${set.done ? 'bg-green-400 border-green-400 text-black' : 'border-gray-500 text-transparent'}`}>✓</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setActiveExIdx(Math.max(0, activeExIdx - 1))} disabled={activeExIdx === 0} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">← Пред.</button>
                <button onClick={() => setActiveExIdx(Math.min(activeWorkout.exercises.length - 1, activeExIdx + 1))} disabled={activeExIdx === activeWorkout.exercises.length - 1} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">След. →</button>
            </div>
        </div>
    );
}


// --- ИСТОРИЯ ТРЕНИРОВОК (С УЛУЧШЕННЫМ РЕДАКТИРОВАНИЕМ) ---
function GymHistory({ gymData, setGymData, setEditingWorkout }: any) {
    if (gymData.history.length === 0) return <div className="glass-card p-8 text-center text-gray-400">История пуста. Начните первую тренировку!</div>;

    const reversedHistory = [...gymData.history].reverse();

    const calcStats = (workout: any) => {
        let totalSets = 0, totalReps = 0, totalTonnage = 0;
        workout.exercises.forEach((ex: any) => {
            ex.sets.forEach((s: any) => {
                if (s.done) {
                    totalSets++;
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    totalReps += r;
                    totalTonnage += w * r;
                }
            });
        });
        const duration = workout.endTime ? (workout.endTime - workout.startTime) / 60000 : 0;
        return { totalSets, totalReps, totalTonnage: Math.round(totalTonnage), duration: Math.round(duration) };
    };

    const deleteWorkout = (workout: any) => {
        const id = workout.id || workout.date;
        setGymData({ ...gymData, history: gymData.history.filter((w: any) => (w.id || w.date) !== id) });
    };

    return (
        <div className="space-y-4">
            {reversedHistory.map((w: any) => {
                const stats = calcStats(w);
                return (
                    <div key={w.id || w.date} className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{w.dayName}</h3>
                                <p className="text-gray-400 text-sm">{new Date(w.date).toLocaleString('ru-RU')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-cyan-400 font-bold">{stats.duration} мин</div>
                                <button onClick={() => setEditingWorkout(w)} className="text-purple-400 text-sm hover:underline">Изменить</button>
                                <button onClick={() => deleteWorkout(w)} className="text-red-400 text-sm hover:underline">Удалить</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalTonnage}</div>
                                <div className="text-xs text-gray-400">Тоннаж (кг)</div>
                            </div>
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalSets}</div>
                                <div className="text-xs text-gray-400">Подходы</div>
                            </div>
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalReps}</div>
                                <div className="text-xs text-gray-400">Повторения</div>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                            {w.exercises.map((ex: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{ex.name}</span>
                                    <span className="text-gray-500">{ex.sets.filter((s:any)=>s.done).map((s: any) => `${s.weight}×${s.reps}`).join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// --- НОВОЕ: КАЛЕНДАРЬ ---
function GymCalendar({ gymData }: any) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const emptyDays = Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => `empty-${i}`);
    const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

    const getWorkoutForDay = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return gymData.history.find((w: any) => w.date.split('T')[0] === dateStr);
    };

    return (
        <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">{today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h2>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-400 mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {emptyDays.map(d => <div key={d}></div>)}
                {days.map(day => {
                    const workout = getWorkoutForDay(day);
                    const isToday = day === today.getDate();
                    return (
                        <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg border ${isToday ? 'border-cyan-400' : 'border-[var(--border)]'} ${workout ? 'bg-green-500/20' : 'bg-[var(--bg-input)]'}`}>
                            <span className={`text-sm ${workout ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{day}</span>
                            {workout && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1"></div>}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500/30 border border-green-400"></div>Тренировка</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[var(--bg-input)] border border-[var(--border)]"></div>Отдых</div>
            </div>
        </div>
    );
}

// --- НОВОЕ: БАЛАНС МЫШЕЧНЫХ ГРУПП ---
function GymMuscleBalance({ gymData }: any) {
    const muscleData: any = {};
    gymData.history.forEach((w: any) => {
        w.exercises.forEach((ex: any) => {
            if (!muscleData[ex.muscle]) muscleData[ex.muscle] = 0;
            ex.sets.forEach((s: any) => {
                if (s.done) {
                    muscleData[ex.muscle] += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
                }
            });
        });
    });

    const muscles = Object.keys(muscleData);
    if (muscles.length === 0) return <div className="glass-card p-8 text-center text-gray-400">Нет данных. Выполните тренировку.</div>;

    const maxTonnage = Math.max(...Object.values(muscleData), 1);

    return (
        <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Распределение нагрузки (кг)</h2>
            <div className="space-y-4">
                {muscles.map(m => (
                    <div key={m}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{m}</span>
                            <span className="text-cyan-400">{Math.round(muscleData[m])} кг</span>
                        </div>
                        <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-3 rounded-full transition-all duration-500" style={{ width: `${(muscleData[m] / maxTonnage) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ================= ЕДИНЫЙ ХАБ СТАТИСТИКИ =================
function UnifiedStats({ logs, testResults, gymData }: any) {
    const last7Logs = logs.slice(-7);
    const avg = (key: string) => last7Logs.length ? (last7Logs.reduce((a: number, b: any) => a + b[key], 0) / last7Logs.length).toFixed(1) : '—';

    const totalTonnage = gymData.history.reduce((acc: number, w: any) => {
        return acc + w.exercises.reduce((exAcc: number, ex: any) => 
            exAcc + ex.sets.reduce((sAcc: number, s: any) => s.done ? sAcc + s.weight * s.reps : sAcc, 0), 0);
    }, 0);

    const testCounts: any = {};
    testResults.forEach((t: any) => { testCounts[t.type] = (testCounts[t.type] || 0) + 1; });
    const uniqueExercises = new Set();
    gymData.history.forEach((w: any) => w.exercises.forEach((e: any) => uniqueExercises.add(e.name)));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Единый хаб статистики</h1>
            <div className="glass-card p-6 rounded-2xl mb-6 bg-cyan-400/5 border border-cyan-400/20">
                <h2 className="text-xl font-bold text-cyan-400 mb-4">Общая картина (за последние 7 дней)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-purple-400">{avg('sleep')}</div>
                        <div className="text-xs text-gray-400 mt-1">Средний сон</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-cyan-400">{avg('focus')}</div>
                        <div className="text-xs text-gray-400 mt-1">Средний фокус</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-green-400">{avg('mood')}</div>
                        <div className="text-xs text-gray-400 mt-1">Настроение</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-pink-400">{Math.round(totalTonnage)}</div>
                        <div className="text-xs text-gray-400 mt-1">Тоннаж в зале (кг)</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">🧠 Когнитивные тесты</h3>
                    {Object.keys(testCounts).length === 0 ? <p className="text-gray-400">Нет данных</p> : (
                        <div className="space-y-3">
                            {Object.entries(testCounts).map(([type, count]: any) => (
                                <div key={type} className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                                    <span className="capitalize text-gray-300">{type}</span>
                                    <span className="text-cyan-400 font-bold">{count} раз</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">🏋️ Спортзал</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">Всего тренировок</span>
                            <span className="text-cyan-400 font-bold">{gymData.history.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">Упражнений в базе</span>
                            <span className="text-cyan-400 font-bold">{uniqueExercises.size}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ================= БАЗА УПРАЖНЕНИЙ (С ГРУППИРОВКОЙ) =================
function GymPRs({ gymData }: any) {
    const [filter, setFilter] = useState('Все');
    
    // Собираем базу всех упражнений и их рекордов
    const db: any = {};
    gymData.history.forEach((w: any) => {
        w.exercises.forEach((ex: any) => {
            if (!db[ex.muscle]) db[ex.muscle] = {};
            if (!db[ex.muscle][ex.name]) db[ex.muscle][ex.name] = { maxWeight: 0, max1RM: 0, maxReps: 0 };
            
            ex.sets.forEach((s: any) => {
                const w = parseFloat(s.weight) || 0;
                const r = parseInt(s.reps) || 0;
                if (w > db[ex.muscle][ex.name].maxWeight) db[ex.muscle][ex.name].maxWeight = w;
                if (r > db[ex.muscle][ex.name].maxReps) db[ex.muscle][ex.name].maxReps = r;
                const e1RM = w * (1 + r / 30);
                if (e1RM > db[ex.muscle][ex.name].max1RM) db[ex.muscle][ex.name].max1RM = e1RM;
            });
        });
    });

    const muscles = ['Все', ...Object.keys(db)];
    if (muscles.length === 1) return <div className="glass-card p-8 text-center text-gray-400">Нет данных для рекордов.</div>;

    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">База упражнений и рекорды</h2>
            
            <div className="flex gap-2 mb-6 flex-wrap">
                {muscles.map(m => (
                    <button key={m} onClick={() => setFilter(m)} className={`px-4 py-1 rounded-full text-sm transition ${filter === m ? 'bg-purple-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {m}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(db).map(muscle => {
                    if (filter !== 'Все' && filter !== muscle) return null;
                    return Object.keys(db[muscle]).map(name => {
                        const pr = db[muscle][name];
                        return (
                            <div key={muscle + name} className="glass-card p-6 rounded-2xl flex items-center gap-4">
                                <div className="text-4xl">🏆</div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{muscle}</p>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-gray-300">Макс. вес: <span className="text-cyan-400 font-bold">{pr.maxWeight} кг</span></span>
                                        <span className="text-gray-300">1PM: <span className="text-purple-400 font-bold">{pr.max1RM.toFixed(1)} кг</span></span>
                                        <span className="text-gray-300">Макс. повт: <span className="text-green-400 font-bold">{pr.maxReps}</span></span>
                                    </div>
                                </div>
                            </div>
                        );
                    });
                })}
            </div>
        </div>
    );
}

// --- УМНЫЙ ИИ-ТРЕНЕР (Со связью со сном) ---
function GymAI({ gymData, logs }: any) {
    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);
    if (!activeProgram) return <div className="glass-card p-8 text-center text-gray-400">Нет активной программы.</div>;

    const exNames = new Set();
    activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => exNames.add(e.name)));

    const getHistory = (name: string) => {
        return gymData.history.filter((w: any) => w.exercises.some((e: any) => e.name === name)).map((w: any) => ({
            date: w.date,
            sets: w.exercises.find((e: any) => e.name === name).sets.filter((s:any) => s.done)
        }));
    };

    const getDayLog = (dateStr: string) => {
        return logs.find((l: any) => l.date.split('T')[0] === dateStr.split('T')[0]);
    };

    const recommendations: any[] = [];

    exNames.forEach((name: string) => {
        const history = getHistory(name);
        if (history.length === 0) return;

        const last = history[history.length - 1];
        if(last.sets.length === 0) return;

        const lastMaxWeight = Math.max(...last.sets.map((s: any) => s.weight));
        const lastTotalReps = last.sets.reduce((sum: number, s: any) => sum + s.reps, 0);

        let targetReps = 10;
        activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => {
            if (e.name === name) {
                const repRange = e.reps.split('-');
                targetReps = repRange.length > 1 ? parseInt(repRange[1]) : parseInt(repRange[0]);
            }
        }));

        const allSetsHitTarget = last.sets.every((s: any) => s.reps >= targetReps);
        const dayLog = getDayLog(last.date);

        if (allSetsHitTarget && history.length >= 1) {
            recommendations.push({
                name,
                text: `Вы успешно выполнили все подходы (${lastTotalReps} повт.). Рекомендуется увеличить рабочий вес до ${lastMaxWeight + 2.5} кг.`,
                status: 'up'
            });
        } else if (history.length >= 2) {
            const prev = history[history.length - 2];
            if(prev.sets.length === 0) return;
            const prevMaxWeight = Math.max(...prev.sets.map((s: any) => s.weight));
            
            if (lastMaxWeight < prevMaxWeight) {
                let extraText = "";
                if (dayLog && dayLog.sleep < 5) {
                    extraText = ` В день тренировки ваш сон был низким (${dayLog.sleep}/10), что, вероятно, снизило силу.`;
                }
                recommendations.push({
                    name,
                    text: `Наблюдается снижение результата (было ${prevMaxWeight} кг, стало ${lastMaxWeight} кг).${extraText} Рекомендуется провести легкую тренировку (deload).`,
                    status: 'down'
                });
            } else {
                recommendations.push({
                    name,
                    text: `Не все подходы достигли целевого диапазона повторений (${targetReps}). Рекомендуется сохранить текущий вес (${lastMaxWeight} кг).`,
                    status: 'stay'
                });
            }
        } else {
            recommendations.push({
                name,
                text: `Недостаточно данных для анализа. Продолжайте выполнять упражнение с текущим весом (${lastMaxWeight} кг).`,
                status: 'stay'
            });
        }
    });

    if (recommendations.length === 0) return <div className="glass-card p-8 text-center text-gray-400">Выполните тренировки, чтобы получить рекомендации.</div>;

    return (
        <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-sm">
                ИИ-анализатор проверяет ваши последние результаты, целевые повторения и связь с качеством сна.
            </div>
            {recommendations.map((rec: any, i: number) => (
                <div key={i} className="glass-card p-6 rounded-2xl flex gap-4">
                    <div className={`text-3xl ${rec.status === 'up' ? 'text-green-400' : rec.status === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {rec.status === 'up' ? '📈' : rec.status === 'down' ? '📉' : '➡️'}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">{rec.name}</h3>
                        <p className="text-gray-300">{rec.text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DopamineRoulette({ kanban, setKanban, dopamineMenu, setDopamineMenu, onClose }: any) {
    const [phase, setPhase] = useState<'idle' | 'spinning' | 'result'>('idle');
    const [result, setResult] = useState<{ text: string; type: 'task' | 'break' } | null>(null);
    const [displayText, setDisplayText] = useState('?');
    const [spinsLeft, setSpinsLeft] = useState(3);
    const [showMenuSettings, setShowMenuSettings] = useState(false);
    const [newMenuItem, setNewMenuItem] = useState('');

    const startSpin = () => {
        if (spinsLeft <= 0) return;
        setPhase('spinning');
        setSpinsLeft(prev => prev - 1);

        // Собираем пул вариантов: 50% задачи, 50% перерывы
        const todoTasks = kanban.filter((t: any) => t.status === 'todo');
        const pool: { text: string; type: 'task' | 'break' }[] = [
            ...todoTasks.map((t: any) => ({ text: t.text, type: 'task' as const })),
            ...dopamineMenu.map((b: string) => ({ text: b, type: 'break' as const }))
        ];

        // Если пул пуст, даем дефолтный
        if (pool.length === 0) {
            pool.push({ text: 'Список пуст. Просто подыши 1 минуту!', type: 'break' });
        }

        // Анимация прокрутки текста
        let spinCount = 0;
        const spinInterval = setInterval(() => {
            const randomItem = pool[Math.floor(Math.random() * pool.length)];
            setDisplayText(randomItem.text.length > 40 ? randomItem.text.slice(0, 40) + '...' : randomItem.text);
            spinCount++;
        }, 80);

        // Останавливаем через 2 секунды
        setTimeout(() => {
            clearInterval(spinInterval);
            const finalResult = pool[Math.floor(Math.random() * pool.length)];
            setResult(finalResult);
            setPhase('result');
        }, 2000);
    };

    const acceptMission = () => {
        if (result?.type === 'task') {
            // Переносим задачу в Doing
            const updatedKanban = kanban.map((t: any) => 
                t.text === result.text ? { ...t, status: 'doing' } : t
            );
            setKanban(updatedKanban);
        }
        onClose(); // Закрываем окно, пользователь пошел делать
    };

    const addMenuItem = () => {
        if (newMenuItem.trim()) {
            setDopamineMenu([...dopamineMenu, newMenuItem.trim()]);
            setNewMenuItem('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center border border-cyan-400/30 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl">✕</button>
                
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                    Генератор Драйва
                </h2>
                <p className="text-gray-400 text-sm mb-8">Судьба решит, что тебе сейчас нужнее: задача или перезагрузка.</p>

                {/* Экран выбора / результата */}
                <div className="h-32 flex items-center justify-center mb-8 bg-black/30 rounded-2xl border border-[var(--border)] p-4 overflow-hidden">
                    {phase === 'idle' && <span className="text-5xl">🤔</span>}
                    {phase === 'spinning' && <span className="text-xl font-bold text-cyan-400 animate-pulse">{displayText}</span>}
                    {phase === 'result' && (
                        <div className="animate-fade-in">
                            <span className="block text-xs uppercase mb-2 font-bold {result.type === 'task' ? 'text-purple-400' : 'text-green-400'}">
                                {result.type === 'task' ? '🎯 Рабочая задача' : '🧊 Легальный перерыв'}
                            </span>
                            <span className="text-lg font-bold text-white">{result.text}</span>
                        </div>
                    )}
                </div>

                {/* Кнопки действий */}
                {phase === 'idle' && (
                    <button onClick={startSpin} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-4 rounded-xl text-lg hover:scale-105 transition">
                        Крутить рулетку
                    </button>
                )}

                {phase === 'spinning' && (
                    <button disabled className="w-full bg-gray-600 text-gray-300 font-bold py-4 rounded-xl text-lg cursor-not-allowed">
                        Крутим...
                    </button>
                )}

                {phase === 'result' && (
                    <div className="flex gap-3">
                        {spinsLeft > 0 ? (
                            <button onClick={startSpin} className="flex-1 border border-[var(--border)] text-gray-400 py-3 rounded-xl hover:bg-white/5 transition">
                                Крутить еще ({spinsLeft})
                            </button>
                        ) : (
                            <div className="flex-1 text-gray-500 text-xs flex items-center justify-center">Лимит прокруток исчерпан. Действуй!</div>
                        )}
                        <button onClick={acceptMission} className="flex-1 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-xl hover:scale-105 transition">
                            Поехали!
                        </button>
                    </div>
                )}

                {/* Настройка меню перерывов */}
                <div className="mt-8 pt-6 border-t border-[var(--border)]">
                    <button onClick={() => setShowMenuSettings(!showMenuSettings)} className="text-sm text-gray-400 hover:text-white">
                        ⚙️ Настроить меню перерывов
                    </button>
                    {showMenuSettings && (
                        <div className="mt-4 text-left">
                            <div className="flex gap-2 mb-3">
                                <input 
                                    type="text" 
                                    value={newMenuItem} 
                                    onChange={e => setNewMenuItem(e.target.value)}
                                    placeholder="Например: Поиграть на гитаре"
                                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2 text-sm text-white outline-none focus:border-cyan-400"
                                />
                                <button onClick={addMenuItem} className="bg-cyan-400/20 text-cyan-400 px-4 rounded-lg text-sm">+</button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {dopamineMenu.map((item: string, idx: number) => (
                                    <span key={idx} className="text-xs bg-white/5 px-2 py-1 rounded-full flex items-center gap-1">
                                        {item}
                                        <button onClick={() => setDopamineMenu(dopamineMenu.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-300">✕</button>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CirclesOfInfluence({ circles, setCircles }: any) {
    const [text, setText] = useState('');
    const [activeCircle, setActiveCircle] = useState<'inner' | 'middle' | 'outer'>('inner');

    const addItem = () => {
        if (!text.trim()) return;
        setCircles([...circles, { id: Date.now(), text, circle: activeCircle }]);
        setText('');
    };

    const removeItem = (id: number) => {
        setCircles(circles.filter((c: any) => c.id !== id));
    };

    const config = {
        inner: { label: 'Мой контроль', text: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/10' },
        middle: { label: 'Мое влияние', text: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/10' },
        outer: { label: 'Вне контроля', text: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/5' }
    };

    const circleOrder = ['inner', 'middle', 'outer'] as const;

    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-3xl font-bold mb-2">Круги влияния</h1>
            <p className="text-gray-400 mb-8">Фокусируйся на красном, отпускай синее. Снижай тревожность.</p>

            {/* Визуализация легенды */}
            <div className="glass-card p-8 rounded-2xl mb-8 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
                    <div className="absolute w-48 h-48 rounded-full border-4 border-blue-400/30 bg-blue-400/5"></div>
                    <div className="absolute w-32 h-32 rounded-full border-4 border-yellow-400/30 bg-yellow-400/5"></div>
                    <div className="absolute w-16 h-16 rounded-full border-4 border-red-400/40 bg-red-400/10 flex items-center justify-center text-[10px] text-center text-red-400 font-bold p-1">Мой контроль</div>
                </div>
                <div className="flex-1 w-full">
                    <div className="flex gap-2 mb-3">
                        {circleOrder.map(key => (
                            <button key={key} onClick={() => setActiveCircle(key)}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm border transition ${activeCircle === key ? `${config[key].bg} ${config[key].border} ${config[key].text}` : 'border-[var(--border)] text-gray-400'}`}>
                                {config[key].label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={text} 
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addItem()}
                            placeholder="Например: Погода, Мой сон, Реакция коллеги..."
                            className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 text-white"
                        />
                        <button onClick={addItem} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 rounded-lg">Добавить</button>
                    </div>
                </div>
            </div>

            {/* Списки по кругам */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {circleOrder.map(key => (
                    <div key={key} className={`glass-card p-6 rounded-2xl border ${config[key].border}`}>
                        <h2 className={`text-lg font-bold mb-4 ${config[key].text}`}>
                            {key === 'inner' && '🔴'} {key === 'middle' && '🟡'} {key === 'outer' && '🔵'} {config[key].label}
                        </h2>
                        <div className="space-y-2">
                            {circles.filter((c: any) => c.circle === key).length === 0 && (
                                <p className="text-gray-500 text-sm italic">Пусто...</p>
                            )}
                            {circles.filter((c: any) => c.circle === key).map((item: any) => (
                                <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg ${config[key].bg} ${key === 'outer' ? 'opacity-60' : ''}`}>
                                    <span className="text-white text-sm">{item.text}</span>
                                    <button onClick={() => removeItem(item.id)} className="text-gray-500 hover:text-red-400 text-sm ml-2">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ================= РЕЖИМ ГИПЕРФОКУСА =================
function HyperfocusOverlay({ hyperfocus, setHyperfocus, kanban, setDiary, setLogs, todayLog }: any) {
    const [phase, setPhase] = useState(hyperfocus.status); // setup, running, finished, interrupted
    const [timeLeft, setTimeLeft] = useState(hyperfocus.duration * 60);
    const [task, setTask] = useState(hyperfocus.task);
    const [reflection, setReflection] = useState('');
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (phase === 'running') {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        setPhase('finished');
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const startFocus = () => {
        setPhase('running');
        setTimeLeft(hyperfocus.duration * 60);
    };

    const finishCycle = () => {
        // Сохраняем в дневник
        const entry = `[Гиперфокус] ${hyperfocus.duration} мин — Сделал: ${reflection || task}`;
        setDiary((prev: any[]) => [{ id: Date.now(), date: new Date().toISOString(), content: entry }, ...prev]);
        
        // Бонус к фокусу в закрытии дня
        if (todayLog) {
            setLogs((prev: any[]) => prev.map((l: any) => l.id === todayLog.id ? { ...l, focus: Math.min(10, l.focus + 1) } : l));
        }
        
        setHyperfocus(null);
    };

    const interruptCycle = () => {
        clearInterval(timerRef.current);
        setPhase('interrupted');
    };

    const saveInterruption = (reason: string) => {
        if (todayLog) {
            setLogs((prev: any[]) => prev.map((l: any) => 
                l.id === todayLog.id ? { ...l, hindered: [...new Set([...(l.hindered || []), reason])] } : l
            ));
        }
        setHyperfocus(null);
    };

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="fixed inset-0 z-50 bg-[var(--bg-main)]/95 backdrop-blur-xl flex items-center justify-center p-6">
            {/* SETUP PHASE */}
            {phase === 'setup' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center">
                    <h2 className="text-3xl font-bold text-cyan-400 mb-2">🚀 Подготовка к гиперфокусу</h2>
                    <p className="text-gray-400 mb-6">Выбери ОДНУ задачу. Остальное будет заблокировано.</p>
                    <select value={task} onChange={e => setTask(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 mb-6 text-white outline-none focus:border-cyan-400">
                        {hyperfocus.todoTasks?.map((t: any) => <option key={t.id} value={t.text}>{t.text}</option>)}
                        <option value="Своя задача">Своя задача</option>
                    </select>
                    <button onClick={startFocus} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-4 rounded-lg text-lg">Начать ({hyperfocus.duration} мин)</button>
                    <button onClick={() => setHyperfocus(null)} className="mt-4 text-gray-400 hover:text-white">Отмена</button>
                </div>
            )}

            {/* RUNNING PHASE */}
            {phase === 'running' && (
                <div className="text-center">
                    <p className="text-gray-400 mb-4 uppercase tracking-widest text-sm">Гиперфокус</p>
                    <div className="text-9xl font-bold text-white tabular-nums mb-8">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</div>
                    <div className="glass-card p-6 rounded-2xl max-w-md mx-auto mb-8 border border-cyan-400/30">
                        <p className="text-xs text-gray-400 mb-1">Текущая задача:</p>
                        <p className="text-xl text-white font-medium">{task}</p>
                    </div>
                    <button onClick={interruptCycle} className="px-8 py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">Прервать цикл</button>
                </div>
            )}

            {/* FINISHED PHASE */}
            {phase === 'finished' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border border-green-400/30">
                    <div className="text-6xl mb-4">✅</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Цикл завершен!</h2>
                    <p className="text-gray-400 mb-6">Что ты успел за {hyperfocus.duration} минут?</p>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Опиши результат..." className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 mb-6 text-white outline-none focus:border-cyan-400 min-h-[80px]" />
                    <button onClick={finishCycle} className="w-full bg-green-400 text-black font-bold py-3 rounded-lg mb-2">Сохранить и выйти</button>
                </div>
            )}

            {/* INTERRUPTED PHASE */}
            {phase === 'interrupted' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border border-red-400/30">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Цикл прерван</h2>
                    <p className="text-gray-400 mb-6">Что отвлекло? Это попадет в аналитику.</p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {['Телефон', 'Шум', 'Голод', 'Мысли', 'Люди'].map(r => (
                            <button key={r} onClick={() => saveInterruption(r)} className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-gray-300 hover:border-red-400 hover:text-red-400 transition">{r}</button>
                        ))}
                    </div>
                    <button onClick={() => setHyperfocus(null)} className="text-gray-400 hover:text-white">Просто закрыть</button>
                </div>
            )}
        </div>
    );
}

// --- Графики ---
function MiniChart({ logs }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: logs.map((l:any) => new Date(l.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})), datasets: [{ label: 'Фокус', data: logs.map((l:any) => l.focus), borderColor: '#64FFDA', tension: 0.4, fill: true }] },
                options: { plugins: { legend: { display: false } }, scales: { y: { max: 10, min: 0 } } }
            });
        }
    }, [logs]);
    return <canvas ref={chartRef}></canvas>;
}

function BigChart({ logs }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: logs.map((l:any) => new Date(l.date).toLocaleDateString('ru-RU', {day: 'numeric', month: 'short'})), datasets: [{ label: 'Сон', data: logs.map((l:any) => l.sleep), borderColor: '#BD93F9', tension: 0.4, fill: true }, { label: 'Фокус', data: logs.map((l:any) => l.focus), borderColor: '#64FFDA', tension: 0.4, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { max: 10, min: 0 } } }
            });
        }
    }, [logs]);
    return <canvas ref={chartRef}></canvas>;
}

function SchulteChart({ results }: any) {
    const chartRef = useRef<any>(null);
    useEffect(() => {
        if (chartRef.current) {
            if (chartRef.current._chart) chartRef.current._chart.destroy();
            chartRef.current._chart = new Chart(chartRef.current, {
                type: 'line', data: { labels: results.map((r:any) => new Date(r.date).toLocaleString('ru-RU', {hour: '2-digit', minute: '2-digit'})), datasets: [{ label: 'Время (сек)', data: results.map((r:any) => r.time), borderColor: '#FF79C6', tension: 0.4, fill: true }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
            });
        }
    }, [results]);
    return <canvas ref={chartRef}></canvas>;
}