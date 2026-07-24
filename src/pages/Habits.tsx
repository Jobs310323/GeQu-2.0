import { useState } from 'react';

export function Habits({ habits, setHabits }: any) {
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
