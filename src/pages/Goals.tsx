import { useState } from 'react';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';

export function Goals({ goals, setGoals }: any) {
    const [newGoal, setNewGoal] = useState('');
    const [openId, setOpenId] = useState<number | null>(null);
    const addGoal = () => { if (!newGoal.trim()) return; setGoals([...goals, { id: Date.now(), title: newGoal, tasks: [] }]); setNewGoal(''); };
    const addTask = (goalId: number, taskText: string) => setGoals(goals.map((g:any) => g.id === goalId ? { ...g, tasks: [...g.tasks, { id: Date.now(), text: taskText, done: false }] } : g));
    const toggleTask = (goalId: number, taskId: number) => setGoals(goals.map((g:any) => g.id === goalId ? { ...g, tasks: g.tasks.map((t:any) => t.id === taskId ? { ...t, done: !t.done } : t) } : g));
    const deleteGoal = (goalId: number) => setGoals(goals.filter((g:any) => g.id !== goalId));
    const toggleOpen = (goalId: number) => setOpenId(prev => prev === goalId ? null : goalId);

    return (
        <div>
            <PageHeader page="goals" title="Цели и шаги" />
            <div className="glass-card p-5 rounded-2xl mb-6 flex flex-col sm:flex-row gap-3">
                <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="Новая большая цель..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-cyan-400" />
                <button onClick={addGoal} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-xl">Добавить цель</button>
            </div>
            {goals.length === 0 && (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    Пока нет целей — добавь первую выше.
                </div>
            )}
            <div className="space-y-3">
                {goals.map((goal:any) => {
                    const doneCount = goal.tasks.filter((t:any) => t.done).length;
                    const progress = goal.tasks.length > 0 ? (doneCount / goal.tasks.length) * 100 : 0;
                    const isOpen = openId === goal.id;
                    return (
                        <div key={goal.id} className="glass-card rounded-2xl overflow-hidden transition-all duration-300">
                            <button onClick={() => toggleOpen(goal.id)} className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition">
                                <Icon name="chevronRight" size={16} className={`text-cyan-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                                <h2 className="text-base font-bold flex-1 truncate">{goal.title}</h2>
                                <div className="w-24 bg-black/30 h-1.5 rounded-full hidden sm:block"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                                <span className="text-cyan-400 text-sm w-12 text-right">{doneCount}/{goal.tasks.length}</span>
                            </button>
                            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="px-5 pb-5">
                                        <div className="flex justify-end mb-4">
                                            <button onClick={() => deleteGoal(goal.id)} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition">
                                                <Icon name="trash" size={14} /> Удалить
                                            </button>
                                        </div>
                                        <div className="w-full bg-black/30 h-2 rounded-full mb-6 sm:hidden"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                                        <TaskInput goalId={goal.id} addTask={addTask} />
                                        <div className="space-y-2 mt-4">
                                            {goal.tasks.map((task:any) => (
                                                <div key={task.id} className="flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-xl">
                                                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(goal.id, task.id)} className="w-5 h-5 cursor-pointer" />
                                                    <span className={task.done ? 'line-through text-gray-500' : 'text-gray-200'}>{task.text}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function TaskInput({ goalId, addTask }: any) {
    const [text, setText] = useState('');
    return (
        <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { addTask(goalId, text); setText(''); } }} placeholder="Добавить шаг..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-400" />
            <button onClick={() => { if(text.trim()) { addTask(goalId, text); setText(''); } }} className="flex items-center justify-center bg-purple-400/20 text-purple-400 border border-purple-400 px-3 py-2 rounded-xl">
                <Icon name="plus" size={14} />
            </button>
        </div>
    );
}
