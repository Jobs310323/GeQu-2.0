import { useState } from 'react';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

export function Kanban({ kanban, setKanban }: any) {
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState('low');
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

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
    const setStatus = (id: number, status: string) => setKanban(kanban.map((t: any) => t.id === id ? { ...t, status } : t));
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
        if (p === 'high') return 'Срочно';
        if (p === 'medium') return 'Средне';
        return 'Низкий';
    }

    return (
        <div>
            <PageHeader page="kanban" title="Канбан-доска" />
            <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-3">
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder="Новая задача..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 outline-none focus:border-cyan-400 text-white" />
                <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 outline-none focus:border-cyan-400 text-white">
                    <option value="low">Низкий приоритет</option>
                    <option value="medium">Средний приоритет</option>
                    <option value="high">Срочный приоритет</option>
                </select>
                <button onClick={addTask} className="bg-cyan-400 text-black font-bold px-6 py-2 rounded-xl">Добавить</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map(col => (
                    <div
                        key={col.id}
                        className={`glass-card p-4 rounded-2xl min-h-[400px] transition-colors duration-200 ${dragOverCol === col.id ? 'ring-2 ring-cyan-400 bg-cyan-400/5' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                        onDragLeave={() => setDragOverCol(prev => prev === col.id ? null : prev)}
                        onDrop={e => {
                            e.preventDefault();
                            setDragOverCol(null);
                            const id = draggedId ?? Number(e.dataTransfer.getData('text/plain'));
                            if (id) setStatus(id, col.id);
                            setDraggedId(null);
                        }}
                    >
                        <h2 className={`text-lg font-bold mb-4 ${col.color}`}>{col.title} ({kanban.filter((t:any) => t.status === col.id).length})</h2>
                        <div className="space-y-3">
                            {kanban.filter((t:any) => t.status === col.id).map((t:any) => (
                                <div
                                    key={t.id}
                                    draggable
                                    onDragStart={e => { setDraggedId(t.id); e.dataTransfer.setData('text/plain', String(t.id)); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                                    className={`bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)] cursor-grab active:cursor-grabbing transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:border-cyan-400/50 ${draggedId === t.id ? 'opacity-30 scale-95' : 'opacity-100'}`}
                                >
                                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit mb-2 border ${getPriorityClass(t.priority)}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                        {getPriorityLabel(t.priority)}
                                    </div>
                                    <p className="text-sm mb-3 text-white">{t.text}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button onClick={() => moveTask(t.id, -1)} disabled={col.id === 'todo'} className="p-1 bg-white/5 rounded-lg disabled:opacity-20 hover:bg-white/10 transition-colors">
                                                <Icon name="chevronLeft" size={14} />
                                            </button>
                                            <button onClick={() => moveTask(t.id, 1)} disabled={col.id === 'done'} className="p-1 bg-white/5 rounded-lg disabled:opacity-20 hover:bg-white/10 transition-colors">
                                                <Icon name="chevronRight" size={14} />
                                            </button>
                                        </div>
                                        <button onClick={() => deleteTask(t.id)} className="p-1 text-red-400 hover:text-red-300 transition-colors">
                                            <Icon name="close" size={14} />
                                        </button>
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
