import type { TFunction } from 'i18next';
import type { MindEdge, MindNode } from '../../types/mindmap';
import { isLeaf, priorityLabel } from '../../lib/mindTree';
import { todayKey } from '../../lib/datetime';

function csvEscape(value: string): string {
    return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportWeekCsv(nodes: MindNode[], edges: MindEdge[], t: TFunction) {
    const now = Date.now();
    const weekAhead = now + 7 * 24 * 60 * 60 * 1000;

    const tasks = nodes.filter(n => {
        if (!isLeaf(n.id, edges)) return false;
        if (!n.dueDate) return false;
        const due = new Date(n.dueDate).getTime();
        return due >= now && due <= weekAhead;
    });

    const rows = [
        [t('plan:mindmap.export.colTask'), t('plan:mindmap.export.colDue'), t('plan:mindmap.export.colHours'), t('plan:mindmap.export.colPriority')],
        ...tasks.map(n => [n.text, n.dueDate ?? '', String(n.estimatedHours ?? ''), priorityLabel(n.priority, t)]),
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
