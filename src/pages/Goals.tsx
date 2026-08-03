import { useState } from 'react';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { useDragReorder } from '../lib/useDragReorder';

export function Goals({ goals, setGoals }: any) {
    const [newGoal, setNewGoal] = useState('');
    const [openIds, setOpenIds] = useState<number[]>([]);

    const addGoal = () => {
        if (!newGoal.trim()) return;
        const goal = { id: Date.now(), title: newGoal, tasks: [] };
        setGoals([...goals, goal]);
        setOpenIds(prev => [...prev, goal.id]);
        setNewGoal('');
    };
    const deleteGoal = (goalId: number) => setGoals(goals.filter((g: any) => g.id !== goalId));
    const setTasks = (goalId: number, tasks: any[]) =>
        setGoals(goals.map((g: any) => (g.id === goalId ? { ...g, tasks } : g)));
    const toggleOpen = (goalId: number) =>
        setOpenIds(prev => (prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]));

    const drag = useDragReorder(goals, setGoals);

    return (
        <div>
            <PageHeader page="goals" title="Цели и шаги" />
            <div className="glass-card p-5 rounded-2xl mb-6 flex flex-col sm:flex-row gap-3">
                <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="Новая большая цель..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-cyan-400" />
                <button onClick={addGoal} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-xl">Добавить цель</button>
            </div>

            {goals.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    Пока нет целей — добавь первую выше.
                </div>
            ) : (
                <>
                    {goals.length > 1 && (
                        <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                            <Icon name="grip" size={13} /> Перетащи за ручку, чтобы поменять порядок
                        </p>
                    )}
                    <div className="space-y-3">
                        {goals.map((goal: any, i: number) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                isOpen={openIds.includes(goal.id)}
                                onToggle={() => toggleOpen(goal.id)}
                                onDelete={() => deleteGoal(goal.id)}
                                setTasks={(tasks: any[]) => setTasks(goal.id, tasks)}
                                gripProps={drag.handleProps}
                                itemProps={drag.itemProps(i)}
                                itemClass={drag.itemClass(i)}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

function GoalCard({ goal, isOpen, onToggle, onDelete, setTasks, gripProps, itemProps, itemClass }: any) {
    const tasks: any[] = goal.tasks ?? [];
    const doneCount = tasks.filter(t => t.done).length;
    const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

    const addTask = (text: string) => setTasks([...tasks, { id: Date.now(), text, done: false, note: '' }]);
    const patchTask = (taskId: number, patch: any) =>
        setTasks(tasks.map(t => (t.id === taskId ? { ...t, ...patch } : t)));
    const deleteTask = (taskId: number) => setTasks(tasks.filter(t => t.id !== taskId));

    const drag = useDragReorder(tasks, setTasks);

    return (
        <div {...itemProps} className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${itemClass}`}>
            <div className="flex items-center gap-2 pl-3">
                <span {...gripProps} title="Перетащить цель"
                    className="text-[var(--text-muted)] hover:text-cyan-400 transition shrink-0 py-4">
                    <Icon name="grip" size={16} />
                </span>
                <button onClick={onToggle} className="flex-1 flex items-center gap-4 py-4 pr-4 text-left hover:bg-white/5 transition rounded-lg">
                    <Icon name="chevronRight" size={16} className={`text-cyan-400 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
                    <h2 className="text-base font-bold flex-1 truncate">{goal.title}</h2>
                    <div className="w-24 bg-black/30 h-1.5 rounded-full hidden sm:block"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                    <span className="text-cyan-400 text-sm w-12 text-right">{doneCount}/{tasks.length}</span>
                </button>
            </div>

            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="px-5 pb-5">
                        <div className="flex justify-end mb-4">
                            <button onClick={onDelete} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition">
                                <Icon name="trash" size={14} /> Удалить цель
                            </button>
                        </div>
                        <div className="w-full bg-black/30 h-2 rounded-full mb-6 sm:hidden"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                        <TaskInput addTask={addTask} />
                        <div className="space-y-2 mt-4">
                            {tasks.map((task, i) => (
                                <StepRow
                                    key={task.id}
                                    task={task}
                                    onPatch={(patch: any) => patchTask(task.id, patch)}
                                    onDelete={() => deleteTask(task.id)}
                                    gripProps={drag.handleProps}
                                    itemProps={drag.itemProps(i)}
                                    itemClass={drag.itemClass(i)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepRow({ task, onPatch, onDelete, gripProps, itemProps, itemClass }: any) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(task.text);
    const [noteOpen, setNoteOpen] = useState(false);
    const hasNote = Boolean(task.note?.trim());

    const startEdit = () => { setDraft(task.text); setEditing(true); };
    const commit = () => {
        const text = draft.trim();
        if (text) onPatch({ text });
        setEditing(false);
    };

    return (
        <div {...itemProps} className={`bg-[var(--bg-input)] rounded-xl ${itemClass}`}>
            <div className="flex items-center gap-2 p-3">
                <span {...gripProps} title="Перетащить шаг"
                    className="text-[var(--text-muted)] hover:text-cyan-400 transition shrink-0">
                    <Icon name="grip" size={14} />
                </span>
                <input type="checkbox" checked={task.done} onChange={() => onPatch({ done: !task.done })} className="w-5 h-5 cursor-pointer shrink-0" />

                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        className="flex-1 bg-transparent border-b border-cyan-400 outline-none text-sm py-0.5"
                    />
                ) : (
                    <span onDoubleClick={startEdit} title="Двойной клик — изменить"
                        className={`flex-1 text-sm cursor-text ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                        {task.text}
                    </span>
                )}

                <button onClick={() => setNoteOpen(o => !o)} title={hasNote ? 'Заметка к шагу' : 'Добавить заметку'}
                    className={`shrink-0 p-1.5 rounded-lg transition ${hasNote || noteOpen ? 'text-cyan-400 bg-cyan-400/10' : 'text-[var(--text-muted)] hover:text-cyan-400'}`}>
                    <Icon name="note" size={14} />
                </button>
                <button onClick={startEdit} title="Изменить шаг"
                    className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-400 transition">
                    <Icon name="edit" size={14} />
                </button>
                <button onClick={onDelete} title="Удалить шаг"
                    className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition">
                    <Icon name="trash" size={14} />
                </button>
            </div>

            {noteOpen ? (
                <div className="px-3 pb-3">
                    <textarea
                        autoFocus
                        value={task.note ?? ''}
                        onChange={e => onPatch({ note: e.target.value })}
                        placeholder="Что выяснилось по этому шагу…"
                        rows={3}
                        className="w-full bg-black/20 border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-cyan-400 resize-y"
                    />
                </div>
            ) : hasNote && (
                <button onClick={() => setNoteOpen(true)}
                    className="w-full text-left px-3 pb-3 -mt-1 text-xs text-[var(--text-muted)] whitespace-pre-wrap hover:text-[var(--text-main)] transition">
                    {task.note}
                </button>
            )}
        </div>
    );
}

function TaskInput({ addTask }: any) {
    const [text, setText] = useState('');
    const submit = () => { if (text.trim()) { addTask(text.trim()); setText(''); } };
    return (
        <div className="flex gap-2">
            <input type="text" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Добавить шаг..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-400" />
            <button onClick={submit} className="flex items-center justify-center bg-purple-400/20 text-purple-400 border border-purple-400 px-3 py-2 rounded-xl">
                <Icon name="plus" size={14} />
            </button>
        </div>
    );
}
