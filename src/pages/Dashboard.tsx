import { useState } from 'react';
import { calculateStreak } from '../lib/helpers';

export function Dashboard({ logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults }: any) {
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
            sleep,
            focus,
            mood,
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
                        <input type="range" min="0" max="10" value={sleep} onChange={e => setSleep(Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2"><span>Фокус</span><span className="text-cyan-400">{focus}/10</span></div>
                        <input type="range" min="0" max="10" value={focus} onChange={e => setFocus(Number(e.target.value))} className="w-full accent-cyan-400" />
                    </div>
                    <div>
                        <div className="flex justify-between text-sm text-gray-400 mb-2"><span>Настроение</span><span className="text-cyan-400">{mood}/10</span></div>
                        <input type="range" min="0" max="10" value={mood} onChange={e => setMood(Number(e.target.value))} className="w-full accent-cyan-400" />
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
