import { useState } from 'react';
import { todayISO } from '../lib/date';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

export function Habits({ habits, setHabits }: any) {
    const [name, setName] = useState('');
    const todayStr = todayISO();

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
        <div className="max-w-3xl">
            <PageHeader page="habits" title="Трекер привычек"
                subtitle="Отмечай ежедневные привычки и следи за серией." />

            <div className="glass-card p-4 rounded-2xl mb-6 flex gap-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addHabit()}
                    placeholder="Новая привычка (напр., Пить воду)..."
                    className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400" />
                <button onClick={addHabit}
                    className="bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg flex items-center gap-1.5 shrink-0">
                    <Icon name="plus" size={16} />
                    Добавить
                </button>
            </div>

            {habits.length === 0 ? (
                <div className="glass-card p-8 rounded-2xl text-center text-gray-500">
                    Пока нет привычек — добавь первую выше.
                </div>
            ) : (
                <div className="space-y-3">
                    {habits.map((h: any) => {
                        const doneToday = h.history.includes(todayStr);
                        const streak = h.history.length;
                        return (
                            <div key={h.id} className="glass-card p-4 rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => toggleHabit(h.id)}
                                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                                            doneToday ? 'bg-green-400 border-green-400 text-black' : 'border-gray-500 text-transparent hover:border-green-400'
                                        }`}>
                                        <Icon name="check" size={18} />
                                    </button>
                                    <div>
                                        <span className="text-lg">{h.name}</span>
                                        <div className="text-xs text-gray-400 flex items-center gap-1">
                                            <Icon name="flame" size={12} className="text-pink-400" />
                                            Серия: {streak} дней
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => deleteHabit(h.id)}
                                    className="text-red-400 text-sm hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-400/10">
                                    <Icon name="trash" size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
