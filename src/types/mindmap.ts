export type MindColor = 'cyan' | 'purple' | 'pink' | 'green' | 'yellow' | 'red';

export type Priority = 'urgent_important' | 'not_urgent_important' | 'urgent_not_important' | 'not_urgent_not_important';
export type EffortType = 'deep_work' | 'routine' | 'social' | 'learning';
export type NodeStatus = 'backlog' | 'in_progress' | 'review' | 'done' | 'archived';
export type MindViewMode = 'normal' | 'strategist' | 'tactician' | 'blindspot';

export interface MindNode {
    id: string;
    text: string;
    x: number;
    y: number;
    color: MindColor;

    dueDate: string | null;
    estimatedHours: number | null;
    progress: number;
    isMilestone: boolean;

    priority: Priority;

    effortType: EffortType;
    energyScore: 1 | 2 | 3 | 4 | 5;

    status: NodeStatus;
    tags: string[];

    lastOpenedAt: string | null;
    createdAt: string;
    updatedAt: string;
    timeSpentTotal: number;
}

export interface MindEdge {
    id: string;
    source: string;
    target: string;
    // Each node exposes a source+target handle per side (see MindMapNode), so
    // xyflow needs to be told which pair an edge binds to — without these it
    // silently fails to render the edge at all once the page reloads.
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

export interface MindMapDoc {
    nodes: MindNode[];
    edges: MindEdge[];
}
