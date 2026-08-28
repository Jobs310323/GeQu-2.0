import type { MindEdge, MindNode } from '../../types/mindmap';
import { isLeaf, PRIORITY_LABEL } from '../../lib/mindTree';
import { todayKey } from '../../lib/datetime';

function csvEscape(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportWeekCsv(nodes: MindNode[], edges: MindEdge[]) {
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000;

    const tasks = nodes.filter(n => {
        if (!isLeaf(n.id, edges)) return false;
        if (!n.dueDate) return false;
        const t = new Date(n.dueDate).getTime();
        return t >= now && t <= weekAhead;
    });

    const rows = [
        ['Задача', 'Срок', 'Часы', 'Приоритет'],
        ...tasks.map(n => [n.text, n.dueDate ?? '', String(n.estimatedHours ?? ''), PRIORITY_LABEL[n.priority]]),
    ];
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-week-${todayKey()}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    return tasks.length;
}
