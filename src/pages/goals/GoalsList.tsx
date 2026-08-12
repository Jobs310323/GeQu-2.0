import { useMemo, useState } from 'react';
import { Icon } from '../../components/Icons';
import { useDragReorder } from '../../lib/useDragReorder';
import { addSubtask, createTask, mapTask, removeTask, sortGoals, sortTasksByTag } from '../../lib/taskTree';
import { copyText, downloadTextFile, formatAllGoalsText, formatGoalText } from '../../lib/exportGoals';
import type { Goal, Task } from '../../types/goals';
import { GoalDescription } from './GoalDescription';
import { StepRow } from './StepRow';
import { TaskInput } from './TaskInput';
import { TagChips } from '../../components/TagChips';

type GoalsListProps = {
    goals: Goal[];
    setGoals: (goals: Goal[]) => void;
};

export function GoalsList({ goals, setGoals }: GoalsListProps) {
    const [newGoal, setNewGoal] = useState('');
    const [openIds, setOpenIds] = useState<number[]>([]);
    const [copiedAll, setCopiedAll] = useState(false);

    const addGoal = () => {
        if (!newGoal.trim()) return;
        const goal: Goal = { id: Date.now(), title: newGoal, tasks: [], tags: [] };
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

    const sortedGoals = useMemo(() => sortGoals(goals), [goals]);
    const drag = useDragReorder(sortedGoals, setGoals);

    const copyAll = async () => {
        if (await copyText(formatAllGoalsText(sortedGoals))) {
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 1500);
        }
    };
    const downloadAll = () => downloadTextFile(`goals-${new Date().toISOString().slice(0, 10)}.txt`, formatAllGoalsText(sortedGoals));

    return (
        <div>
            <div className="glass-card p-5 rounded-2xl mb-6 flex flex-col sm:flex-row gap-3">
                <input type="text" value={newGoal} onChange={e => setNewGoal(e.target.value)} onKeyDown={e => e.key === 'Enter' && addGoal()} placeholder="Новая большая цель..." className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-3 outline-none focus:border-cyan-400" />
                <button onClick={addGoal} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-xl">Добавить цель</button>
            </div>

            {goals.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                    <button onClick={copyAll} title="Скопировать все цели и шаги для промта"
                        className="flex items-center gap-1.5 text-xs glass-card rounded-full px-3 py-1.5 text-[var(--text-main)] hover:text-cyan-400 transition">
                        <Icon name={copiedAll ? 'check' : 'clipboard'} size={13} /> {copiedAll ? 'Скопировано' : 'Скопировать всё'}
                    </button>
                    <button onClick={downloadAll} title="Скачать все цели и шаги .txt"
                        className="flex items-center gap-1.5 text-xs glass-card rounded-full px-3 py-1.5 text-[var(--text-main)] hover:text-cyan-400 transition">
                        <Icon name="download" size={13} /> Скачать всё .txt
                    </button>
                </div>
            )}

            {goals.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    Пока нет целей — добавь первую выше.
                </div>
            ) : (
                <>
                    {goals.length > 1 && (
                        <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                            <Icon name="grip" size={13} /> Перетащи за ручку, чтобы поменять порядок · выполненные цели опускаются вниз, остальные группируются по тегу
                        </p>
                    )}
                    <div className="space-y-3">
                        {sortedGoals.map((goal, i) => (
                            <GoalCard
                                key={goal.id}
                                goal={goal}
                                isOpen={openIds.includes(goal.id)}
                                onToggle={() => toggleOpen(goal.id)}
                                onDelete={() => deleteGoal(goal.id)}
                                setTasks={(tasks: Task[]) => setTasks(goal.id, tasks)}
                                setDescription={(description: string) => patchGoal(goal.id, { description })}
                                setTags={(tags: string[]) => patchGoal(goal.id, { tags })}
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
    setTags: (tags: string[]) => void;
    gripProps: ReturnType<typeof useDragReorder>['handleProps'];
    itemProps: ReturnType<ReturnType<typeof useDragReorder>['itemProps']>;
    itemClass: string;
};

function GoalCard({ goal, isOpen, onToggle, onDelete, setTasks, setDescription, setTags, gripProps, itemProps, itemClass }: GoalCardProps) {
    const [copied, setCopied] = useState(false);
    const rawTasks = goal.tasks ?? [];
    const doneCount = rawTasks.filter(t => t.done).length;
    const progress = rawTasks.length > 0 ? (doneCount / rawTasks.length) * 100 : 0;
    const tasks = useMemo(() => sortTasksByTag(rawTasks), [rawTasks]);

    const addTask = (text: string) => setTasks([...rawTasks, createTask(text)]);
    const patchTask = (taskId: number, patch: Partial<Task>) => setTasks(mapTask(rawTasks, taskId, t => ({ ...t, ...patch })));
    const deleteTask = (taskId: number) => setTasks(removeTask(rawTasks, taskId));
    const addChildTask = (parentId: number, text: string) => setTasks(addSubtask(rawTasks, parentId, createTask(text)));

    const drag = useDragReorder(tasks, setTasks);

    const copyGoal = async () => {
        if (await copyText(formatGoalText(goal))) {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };
    const downloadGoal = () => downloadTextFile(`${goal.title.slice(0, 40).replace(/[^\p{L}\p{N}]+/gu, '-')}.txt`, formatGoalText(goal));

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
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2">
                                <button onClick={copyGoal} title="Скопировать цель и шаги для промта"
                                    className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-cyan-400 transition">
                                    <Icon name={copied ? 'check' : 'clipboard'} size={13} /> {copied ? 'Скопировано' : 'Скопировать'}
                                </button>
                                <button onClick={downloadGoal} title="Скачать цель и шаги .txt"
                                    className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-cyan-400 transition">
                                    <Icon name="download" size={13} /> Скачать .txt
                                </button>
                            </div>
                            <button onClick={onDelete} className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition">
                                <Icon name="trash" size={14} /> Удалить цель
                            </button>
                        </div>
                        <TagChips tags={goal.tags ?? []} onChange={setTags} className="mb-4" />
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
