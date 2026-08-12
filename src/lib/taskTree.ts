import type { Task, Goal } from '../types/goals';

export function createTask(text: string): Task {
    return { id: Date.now(), text, done: false, note: '', subtasks: [], tags: [] };
}

export function normalizeTask(raw: Partial<Task> & { id: number; text: string }): Task {
    return {
        id: raw.id,
        text: raw.text,
        done: raw.done ?? false,
        note: raw.note ?? '',
        subtasks: (raw.subtasks ?? []).map(normalizeTask),
        tags: raw.tags ?? [],
    };
}

export function normalizeGoal(raw: Partial<Goal> & { id: number; title: string }): Goal {
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        tasks: (raw.tasks ?? []).map(normalizeTask),
        order: raw.order,
        tags: raw.tags ?? [],
    };
}

export function mapTask(tasks: Task[], id: number, updater: (task: Task) => Task): Task[] {
    return tasks.map(task => {
        if (task.id === id) return updater(task);
        if (task.subtasks.length === 0) return task;
        return { ...task, subtasks: mapTask(task.subtasks, id, updater) };
    });
}

export function removeTask(tasks: Task[], id: number): Task[] {
    return tasks
        .filter(task => task.id !== id)
        .map(task => (task.subtasks.length === 0 ? task : { ...task, subtasks: removeTask(task.subtasks, id) }));
}

export function addSubtask(tasks: Task[], parentId: number, newTask: Task): Task[] {
    return tasks.map(task => {
        if (task.id === parentId) return { ...task, subtasks: [...task.subtasks, newTask] };
        if (task.subtasks.length === 0) return task;
        return { ...task, subtasks: addSubtask(task.subtasks, parentId, newTask) };
    });
}

export function findTask(tasks: Task[], id: number): Task | null {
    for (const task of tasks) {
        if (task.id === id) return task;
        if (task.subtasks.length > 0) {
            const found = findTask(task.subtasks, id);
            if (found) return found;
        }
    }
    return null;
}

export function flattenTasks(tasks: Task[]): Task[] {
    return tasks.flatMap(task => [task, ...flattenTasks(task.subtasks)]);
}

/** A goal is "done" once it has at least one step and every step (recursively) is checked off. */
export function isGoalComplete(goal: Goal): boolean {
    const all = flattenTasks(goal.tasks);
    return all.length > 0 && all.every(t => t.done);
}

/** Alphabetically-first tag, or null for untagged — the sort key for tag grouping. */
function primaryTag(tags: string[] | undefined): string | null {
    if (!tags || tags.length === 0) return null;
    return [...tags].sort((a, b) => a.localeCompare(b))[0];
}

function compareByTag(a: { tags: string[] }, b: { tags: string[] }): number {
    const ta = primaryTag(a.tags);
    const tb = primaryTag(b.tags);
    if (ta === tb) return 0;
    if (ta === null) return 1;
    if (tb === null) return -1;
    return ta.localeCompare(tb);
}

/** Completed goals sink to the bottom; within each bucket, goals group by tag. Stable, so manual drag order survives as the tiebreak. */
export function sortGoals(goals: Goal[]): Goal[] {
    return [...goals].sort((a, b) => {
        const doneDiff = Number(isGoalComplete(a)) - Number(isGoalComplete(b));
        if (doneDiff !== 0) return doneDiff;
        return compareByTag(a, b);
    });
}

/** Steps sorted by tag (recursively into subtasks), stable so manual order survives as the tiebreak. */
export function sortTasksByTag(tasks: Task[]): Task[] {
    return [...tasks].sort(compareByTag).map(t => (t.subtasks.length ? { ...t, subtasks: sortTasksByTag(t.subtasks) } : t));
}
