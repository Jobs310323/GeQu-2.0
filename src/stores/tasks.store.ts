import { create } from 'zustand';
import type { KanbanTask } from '../types/domain';
import type { Goal } from '../types/goals';
import { hydrate, persistSlices } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Tasks and goals: two views of the same intent, so they share a store —
// a Kanban card is what you are doing now, a goal step is what it is for.

type TasksState = {
    kanban: KanbanTask[];
    goals: Goal[];
    setKanban: Setter<KanbanTask[]>;
    setGoals: Setter<Goal[]>;
    addTask: (task: KanbanTask) => void;
    updateTask: (id: number, patch: Partial<KanbanTask>) => void;
    removeTask: (id: number) => void;
};

export const useTasks = create<TasksState>()(set => ({
    kanban: hydrate<KanbanTask[]>('kanban', []),
    goals: hydrate<Goal[]>('goals', []),
    setKanban: next => set(s => ({ kanban: resolve(next, s.kanban) })),
    setGoals: next => set(s => ({ goals: resolve(next, s.goals) })),
    addTask: task => set(s => ({ kanban: [...s.kanban, task] })),
    updateTask: (id, patch) => set(s => ({ kanban: s.kanban.map(t => (t.id === id ? { ...t, ...patch } : t)) })),
    removeTask: id => set(s => ({ kanban: s.kanban.filter(t => t.id !== id) })),
}));

persistSlices(useTasks, { kanban: s => s.kanban, goals: s => s.goals });

export const selectKanban = (s: TasksState) => s.kanban;
export const selectGoals = (s: TasksState) => s.goals;

/**
 * Derives open tasks from a list already read from the store.
 *
 * NOT a store selector, deliberately. A selector that builds a new array —
 * `s => s.kanban.filter(...)` — returns a different reference on every call, and
 * zustand compares with `Object.is`, so the component re-renders, the selector
 * runs again, and React aborts with "maximum update depth exceeded". Select the
 * raw slice and derive from it in a `useMemo` instead.
 */
export const openTasksOf = (kanban: KanbanTask[]) => kanban.filter(t => t.status !== 'done');
