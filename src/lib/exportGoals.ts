import type { TFunction } from 'i18next';
import type { Goal, Task } from '../types/goals';

function renderTasks(tasks: Task[], depth: number, t: TFunction): string[] {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    for (const task of tasks) {
        const box = task.done ? '[x]' : '[ ]';
        const tagStr = task.tags.length ? t('plan:goals.exportTaskTags', { tags: task.tags.join(', ') }) : '';
        lines.push(`${indent}- ${box} ${task.text}${tagStr}`);
        if (task.note.trim()) {
            for (const noteLine of task.note.trim().split('\n')) lines.push(`${indent}  > ${noteLine}`);
        }
        if (task.subtasks.length) lines.push(...renderTasks(task.subtasks, depth + 1, t));
    }
    return lines;
}

export function formatGoalText(goal: Goal, t: TFunction): string {
    const lines: string[] = [`# ${goal.title}`];
    if (goal.tags.length) lines.push(t('plan:goals.exportTags', { tags: goal.tags.join(', ') }));
    if (goal.description?.trim()) lines.push('', goal.description.trim());
    lines.push('', t('plan:goals.exportStepsHeading'));
    const taskLines = renderTasks(goal.tasks, 0, t);
    lines.push(...(taskLines.length ? taskLines : [t('plan:goals.exportNoSteps')]));
    return lines.join('\n');
}

export function formatAllGoalsText(goals: Goal[], t: TFunction): string {
    if (goals.length === 0) return t('plan:goals.exportNoGoals');
    return goals.map(goal => formatGoalText(goal, t)).join('\n\n---\n\n');
}

export async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

export function downloadTextFile(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
