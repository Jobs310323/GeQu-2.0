export type MindColor = 'cyan' | 'purple' | 'pink' | 'green' | 'yellow' | 'red';

export interface MindNode {
    id: string;
    text: string;
    x: number;
    y: number;
    color: MindColor;
}

export interface MindEdge {
    id: string;
    source: string;
    target: string;
}

export interface MindMapDoc {
    nodes: MindNode[];
    edges: MindEdge[];
}
