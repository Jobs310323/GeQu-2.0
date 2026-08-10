import type { MindNode } from '../../types/mindmap';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function generateWeeklyReport(nodes: MindNode[]): string[] {
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
        ? `Вы открыли ${openedThisWeek.length} ${plural(openedThisWeek.length, 'ветку', 'ветки', 'веток')} за неделю. Чаще всего: «${mostOpened.text}».`
        : 'На этой неделе вы ещё не открывали ни одной ветки.');
    lines.push(`Закрыто задач: ${doneThisWeek.length}.`);
    lines.push(`Баланс: ${deepWorkHours}ч глубокой работы против ${routineHours}ч рутины.`);
    return lines;
}

function plural(n: number, one: string, few: string, many: string): string {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
}
