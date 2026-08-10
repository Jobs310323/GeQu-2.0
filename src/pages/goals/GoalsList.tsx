import { useState } from 'react';
import { Icon } from '../../components/Icons';
import { useDragReorder } from '../../lib/useDragReorder';
import { addSubtask, createTask, mapTask, removeTask } from '../../lib/taskTree';
import type { Goal, Task } from '../../types/goals';
import { GoalDescription } from './GoalDescription';
import { StepRow } from './StepRow';
import { TaskInput } from './TaskInput';

type GoalsListProps = {
    goals: Goal[];
    setGoals: (goals: Goal[]) => void;
};

export function GoalsList({ goals, setGoals }: GoalsListProps) {
    const [newGoal, setNewGoal] = useState('');
    const [openIds, setOpenIds] = useState<number[]>([]);

    const addGoal = () => {
        if (!newGoal.trim()) return;
        const goal: Goal = { id: Date.now(), title: newGoal, tasks: [] };
        setGoals([...goals, goal]);
        setOpenIds(prev => [...prev, goal.id]);
        setNewGoal('');
    };
    const deleteGoal = (goalId: number) => setGoals(goals.filter(g => g.id !== goalId));
    const patchGoal = (goalId: number, patch: Partial<Goal>) =>
        setGoals(goals.map(g => (g.id === goalId ? { ...g, ...patch } : g)));
    const setTasks = (goalId: number, tasks: Task[]) => patchGoal(goalId, { tasks });
    const toggleOpen = (goalId: number) =>
        setOpenIds(prev => (prev.includes(goalId) ? prev.filter(id => id !== goalId) : [...prev, goalId]));

    const drag = useDragReorder(goals, setGoals);

    return (
        <div>
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
                        {goals.map((goal, i) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                isOpen={openIds.includes(goal.id)}
                                onToggle={() => toggleOpen(goal.id)}
                                onDelete={() => deleteGoal(goal.id)}
                                setTasks={(tasks: Task[]) => setTasks(goal.id, tasks)}
                                setDescription={(description: string) => patchGoal(goal.id, { description })}
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

type GoalCardProps = {
    goal: Goal;
    isOpen: boolean;
    onToggle: () => void;
    onDelete: () => void;
    setTasks: (tasks: Task[]) => void;
    setDescription: (description: string) => void;
    gripProps: ReturnType<typeof useDragReorder>['handleProps'];
    itemProps: ReturnType<ReturnType<typeof useDragReorder>['itemProps']>;
    itemClass: string;
};

function GoalCard({ goal, isOpen, onToggle, onDelete, setTasks, setDescription, gripProps, itemProps, itemClass }: GoalCardProps) {
    const tasks = goal.tasks ?? [];
    const doneCount = tasks.filter(t => t.done).length;
    const progress = tasks.length > 0 ? (doneCount / tasks.length) * 100 : 0;

    const addTask = (text: string) => setTasks([...tasks, createTask(text)]);
    const patchTask = (taskId: number, patch: Partial<Task>) => setTasks(mapTask(tasks, taskId, t => ({ ...t, ...patch })));
    const deleteTask = (taskId: number) => setTasks(removeTask(tasks, taskId));
    const addChildTask = (parentId: number, text: string) => setTasks(addSubtask(tasks, parentId, createTask(text)));

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
                        <GoalDescription description={goal.description} onSave={setDescription} />
                        <div className="w-full bg-black/30 h-2 rounded-full mb-6 sm:hidden"><div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-2 rounded-full transition-all" style={{ width: `${progress}%` }}></div></div>
                        <TaskInput addTask={addTask} />
                        <div className="space-y-2 mt-4">
                            {tasks.map((task, i) => (
                                <StepRow
                                    key={task.id}
                                    task={task}
                                    onPatch={patchTask}
                                    onDelete={deleteTask}
                                    onAddChild={addChildTask}
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
