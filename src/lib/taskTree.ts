import type { Task, Goal } from '../types/goals';

export function createTask(text: string): Task {
    return { id: Date.now(), text, done: false, note: '', subtasks: [] };
}

export function normalizeTask(raw: Partial<Task> & { id: number; text: string }): Task {
    return {
        id: raw.id,
        text: raw.text,
        done: raw.done ?? false,
        note: raw.note ?? '',
        subtasks: (raw.subtasks ?? []).map(normalizeTask),
    };
}

export function normalizeGoal(raw: Partial<Goal> & { id: number; title: string }): Goal {
    return {
        id: raw.id,
        title: raw.title,
        description: raw.description,
        tasks: (raw.tasks ?? []).map(normalizeTask),
        order: raw.order,
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
