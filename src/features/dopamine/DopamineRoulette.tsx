import { useState } from 'react';

export function DopamineRoulette({ kanban, setKanban, dopamineMenu, setDopamineMenu, energy = 5, onClose }: any) {
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

        // Weighted pool rather than a flat 50/50: on low energy the wheel should
        // mostly offer recovery, on high energy mostly work — and among tasks,
        // the urgent ones should come up more often than 'buy a lightbulb'.
        const todoTasks = kanban.filter((t: any) => t.status === 'todo');
        const taskShare = energy >= 7 ? 3 : energy >= 4 ? 1 : 0.35;
        const priorityWeight = (p: string) => (p === 'high' ? 3 : p === 'medium' ? 2 : 1);

        const pool: { text: string; type: 'task' | 'break'; w: number }[] = [
            ...todoTasks.map((t: any) => ({
                text: t.text, type: 'task' as const,
                w: priorityWeight(t.priority) * taskShare,
            })),
            ...dopamineMenu.map((b: string) => ({ text: b, type: 'break' as const, w: 1 })),
        ];

        if (pool.length === 0) {
            pool.push({ text: 'Список пуст. Просто подыши 1 минуту!', type: 'break', w: 1 });
        }

        const totalWeight = pool.reduce((s, i) => s + i.w, 0);
        const pick = () => {
            let r = Math.random() * totalWeight;
            for (const item of pool) { r -= item.w; if (r <= 0) return item; }
            return pool[pool.length - 1];
        };

        // Анимация прокрутки текста
        const spinInterval = setInterval(() => {
            const randomItem = pick();
            setDisplayText(randomItem.text.length > 40 ? randomItem.text.slice(0, 40) + '...' : randomItem.text);
        }, 80);

        // Останавливаем через 2 секунды
        setTimeout(() => {
            clearInterval(spinInterval);
            const finalResult = pick();
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
                <p className="text-gray-400 text-sm mb-2">Судьба решит, что тебе сейчас нужнее: задача или перезагрузка.</p>
                <p className="text-xs mb-6">
                    <span className="text-gray-500">Энергия {energy.toFixed(1)} — </span>
                    <span className={energy >= 7 ? 'text-cyan-400' : energy >= 4 ? 'text-gray-400' : 'text-pink-400'}>
                        {energy >= 7 ? 'чаще выпадут задачи' : energy >= 4 ? 'поровну задач и пауз' : 'чаще выпадут паузы'}
                    </span>
                </p>

                {/* Экран выбора / результата */}
                <div className="h-32 flex items-center justify-center mb-8 bg-black/30 rounded-2xl border border-[var(--border)] p-4 overflow-hidden">
                    {phase === 'idle' && <span className="text-5xl">💭</span>}
                    {phase === 'spinning' && <span className="text-xl font-bold text-cyan-400 animate-pulse">{displayText}</span>}
                    {phase === 'result' && result && (
                        <div className="animate-fade-in">
                            <span className="block text-xs uppercase mb-2 font-bold {result.type === 'task' ? 'text-purple-400' : 'text-green-400'}">
                                {result.type === 'task' ? '🎯 Рабочая задача' : '❄️ Легальный перерыв'}
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
                                        <button onClick={() => setDopamineMenu(dopamineMenu.filter((_: string, i: number) => i !== idx))} className="text-red-400 hover:text-red-300">✕</button>
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
