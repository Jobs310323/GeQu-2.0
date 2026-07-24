import { useState } from 'react';

export function Kanban({ kanban, setKanban }: any) {
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
