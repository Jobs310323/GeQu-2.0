import type { EffortType, MindEdge, MindNode, Priority } from '../types/mindmap';

export function createNode(text: string, x: number, y: number, color: MindNode['color']): MindNode {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(), text, x, y, color,
        dueDate: null, estimatedHours: null, progress: 0, isMilestone: false,
        priority: 'not_urgent_important',
        effortType: 'routine', energyScore: 3,
        status: 'backlog', tags: [],
        lastOpenedAt: null, createdAt: now, updatedAt: now, timeSpentTotal: 0,
    };
}

export function normalizeNode(raw: Partial<MindNode> & { id: string; text: string; x: number; y: number; color: MindNode['color'] }): MindNode {
    const now = new Date().toISOString();
    return {
        id: raw.id, text: raw.text, x: raw.x, y: raw.y, color: raw.color,
        dueDate: raw.dueDate ?? null,
        estimatedHours: raw.estimatedHours ?? null,
        progress: raw.progress ?? 0,
        isMilestone: raw.isMilestone ?? false,
        priority: raw.priority ?? 'not_urgent_important',
        effortType: raw.effortType ?? 'routine',
        energyScore: raw.energyScore ?? 3,
        status: raw.status ?? 'backlog',
        tags: raw.tags ?? [],
        lastOpenedAt: raw.lastOpenedAt ?? null,
        createdAt: raw.createdAt ?? now,
        updatedAt: raw.updatedAt ?? now,
        timeSpentTotal: raw.timeSpentTotal ?? 0,
    };
}

/** Parent → direct children, derived from edges (source = parent, target = child). */
export function buildChildrenMap(edges: MindEdge[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const e of edges) {
        const list = map.get(e.source) ?? [];
        list.push(e.target);
        map.set(e.source, list);
    }
    return map;
}

/** Child → its parents (a node can have more than one incoming edge). */
export function buildParentMap(edges: MindEdge[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    for (const e of edges) {
        const list = map.get(e.target) ?? [];
        list.push(e.source);
        map.set(e.target, list);
    }
    return map;
}

/** BFS depth from the nearest root (a node with no incoming edge). Disconnected nodes are depth 0. */
export function computeDepths(nodes: MindNode[], edges: MindEdge[]): Map<string, number> {
    const parents = buildParentMap(edges);
    const children = buildChildrenMap(edges);
    const depths = new Map<string, number>();
    const roots = nodes.filter(n => !parents.has(n.id));
    const queue: Array<{ id: string; depth: number }> = roots.map(r => ({ id: r.id, depth: 0 }));
    const visited = new Set<string>();
    while (queue.length) {
        const { id, depth } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);
        depths.set(id, depth);
        for (const childId of children.get(id) ?? []) {
            if (!visited.has(childId)) queue.push({ id: childId, depth: depth + 1 });
        }
    }
    for (const n of nodes) if (!depths.has(n.id)) depths.set(n.id, 0);
    return depths;
}

/** Progress of a parent = average effective progress of its direct children, recursively. Leaves use their own progress. */
export function computeEffectiveProgress(nodes: MindNode[], edges: MindEdge[]): Map<string, number> {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const children = buildChildrenMap(edges);
    const result = new Map<string, number>();
    const visiting = new Set<string>();

    function resolve(id: string): number {
        if (result.has(id)) return result.get(id)!;
        const node = byId.get(id);
        if (!node) return 0;
        const kids = (children.get(id) ?? []).filter(k => byId.has(k));
        if (kids.length === 0 || visiting.has(id)) {
            result.set(id, node.progress);
            return node.progress;
        }
        visiting.add(id);
        const avg = kids.reduce((sum, k) => sum + resolve(k), 0) / kids.length;
        visiting.delete(id);
        const rounded = Math.round(avg);
        result.set(id, rounded);
        return rounded;
    }

    for (const n of nodes) resolve(n.id);
    return result;
}

/** Sum of estimatedHours across all descendants of a node (not including itself). */
export function computeSubtreeHours(nodes: MindNode[], edges: MindEdge[]): Map<string, number> {
    const byId = new Map(nodes.map(n => [n.id, n]));
    const children = buildChildrenMap(edges);
    const result = new Map<string, number>();

    function collectDescendants(id: string, visited: Set<string>): string[] {
        const out: string[] = [];
        for (const childId of children.get(id) ?? []) {
            if (visited.has(childId)) continue;
            visited.add(childId);
            out.push(childId, ...collectDescendants(childId, visited));
        }
        return out;
    }

    for (const n of nodes) {
        const descendants = collectDescendants(n.id, new Set([n.id]));
        const hours = descendants.reduce((sum, id) => sum + (byId.get(id)?.estimatedHours ?? 0), 0);
        result.set(n.id, hours);
    }
    return result;
}

export function isOverdue(node: MindNode): boolean {
    if (!node.dueDate || node.status === 'done' || node.status === 'archived') return false;
    return new Date(node.dueDate).getTime() < new Date(new Date().toDateString()).getTime();
}

export function isLeaf(nodeId: string, edges: MindEdge[]): boolean {
    return !edges.some(e => e.source === nodeId);
}

export const PRIORITY_LABEL: Record<Priority, string> = {
    urgent_important: 'Срочно / важно',
    not_urgent_important: 'Не срочно / важно',
    urgent_not_important: 'Срочно / не важно',
    not_urgent_not_important: 'Не срочно / не важно',
};

export const EFFORT_LABEL: Record<EffortType, string> = {
    deep_work: 'Глубокая работа',
    routine: 'Рутина',
    social: 'Социальное',
    learning: 'Обучение',
};
