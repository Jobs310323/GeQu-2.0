import type { Goal, Task } from '../types/goals';

function renderTasks(tasks: Task[], depth: number): string[] {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    for (const t of tasks) {
        const box = t.done ? '[x]' : '[ ]';
        const tagStr = t.tags.length ? ` (теги: ${t.tags.join(', ')})` : '';
        lines.push(`${indent}- ${box} ${t.text}${tagStr}`);
        if (t.note.trim()) {
            for (const noteLine of t.note.trim().split('\n')) lines.push(`${indent}  > ${noteLine}`);
        }
        if (t.subtasks.length) lines.push(...renderTasks(t.subtasks, depth + 1));
    }
    return lines;
}

export function formatGoalText(goal: Goal): string {
    const lines: string[] = [`# ${goal.title}`];
    if (goal.tags.length) lines.push(`Теги: ${goal.tags.join(', ')}`);
    if (goal.description?.trim()) lines.push('', goal.description.trim());
    lines.push('', '## Шаги');
    const taskLines = renderTasks(goal.tasks, 0);
    lines.push(...(taskLines.length ? taskLines : ['(шагов пока нет)']));
    return lines.join('\n');
}

export function formatAllGoalsText(goals: Goal[]): string {
    if (goals.length === 0) return 'Целей пока нет.';
    return goals.map(formatGoalText).join('\n\n---\n\n');
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
