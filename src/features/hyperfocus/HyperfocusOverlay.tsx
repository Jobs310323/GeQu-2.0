import { useState, useEffect, useRef } from 'react';
import { Icon } from '../../components/Icons';

export function HyperfocusOverlay({ hyperfocus, setHyperfocus, setDiary, setLogs, todayLog }: any) {
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
                    <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="rocket" size={26} />
                    </div>
                    <h2 className="text-3xl font-bold text-cyan-400 mb-2">Подготовка к гиперфокусу</h2>
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
                    <div className="w-16 h-16 rounded-2xl bg-green-400/10 text-green-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="check" size={30} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Цикл завершен!</h2>
                    <p className="text-gray-400 mb-6">Что ты успел за {hyperfocus.duration} минут?</p>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder="Опиши результат..." className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 mb-6 text-white outline-none focus:border-cyan-400 min-h-[80px]" />
                    <button onClick={finishCycle} className="w-full bg-green-400 text-black font-bold py-3 rounded-lg mb-2">Сохранить и выйти</button>
                </div>
            )}

            {/* INTERRUPTED PHASE */}
            {phase === 'interrupted' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border border-red-400/30">
                    <div className="w-14 h-14 rounded-2xl bg-red-400/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="alertTriangle" size={26} />
                    </div>
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
