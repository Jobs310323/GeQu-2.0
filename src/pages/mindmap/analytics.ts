import type { TFunction } from 'i18next';
import type { MindNode } from '../../types/mindmap';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function generateWeeklyReport(nodes: MindNode[], t: TFunction): string[] {
    const now = Date.now();
    const since = now - WEEK_MS;

    const openedThisWeek = nodes.filter(n => n.lastOpenedAt && new Date(n.lastOpenedAt).getTime() >= since);
    const mostOpened = openedThisWeek.length > 0
        ? [...openedThisWeek].sort((a, b) => new Date(b.lastOpenedAt!).getTime() - new Date(a.lastOpenedAt!).getTime())[0]
        : null;

    const doneThisWeek = nodes.filter(n => n.status === 'done' && new Date(n.updatedAt).getTime() >= since);

    const deepWorkHours = nodes.filter(n => n.effortType === 'deep_work').reduce((s, n) => s + (n.estimatedHours ?? 0), 0);
    const routineHours = nodes.filter(n => n.effortType === 'routine').reduce((s, n) => s + (n.estimatedHours ?? 0), 0);

    const lines: string[] = [];
    lines.push(mostOpened
        ? t('plan:mindmap.report.openedWithMost', { count: openedThisWeek.length, node: mostOpened.text })
        : t('plan:mindmap.report.openedNone'));
    lines.push(t('plan:mindmap.report.closed', { count: doneThisWeek.length }));
    lines.push(t('plan:mindmap.report.balance', { deepWork: deepWorkHours, routine: routineHours }));
    return lines;
}
