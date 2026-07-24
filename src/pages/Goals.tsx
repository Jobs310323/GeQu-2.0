import { useState } from 'react';

export function Goals({ goals, setGoals }: any) {
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

export function TaskInput({ goalId, addTask }: any) {
    const [text, setText] = useState('');
    return (
        <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { addTask(goalId, text); setText(''); } }} placeholder="Добавить шаг..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm outline-none focus:border-purple-400" />
            <button onClick={() => { if(text.trim()) { addTask(goalId, text); setText(''); } }} className="bg-purple-400/20 text-purple-400 border border-purple-400 px-4 py-2 rounded-lg text-sm">+</button>
        </div>
    );
}
