import { useEffect, useMemo, useRef } from 'react';
import {
    addEdge, Background, Controls, ReactFlow, ReactFlowProvider,
    useEdgesState, useNodesState, useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { DB } from '../lib/db';
import { COLOR_HEX, MIND_COLORS } from './mindmap/colors';
import { mindNodeTypes } from './mindmap/MindMapNode';
import type { MindColor, MindEdge, MindMapDoc, MindNode } from '../types/mindmap';
import type { MindFlowNode, MindNodeData } from './mindmap/MindMapNode';

function edgeStyle(color: MindColor): Edge['style'] {
    return { stroke: COLOR_HEX[color], strokeWidth: 1.75 };
}

function loadInitial(callbacks: Omit<MindNodeData, 'text' | 'color'>): { nodes: MindFlowNode[]; edges: Edge[] } {
    const doc = DB.get('mindmap', { nodes: [], edges: [] }) as MindMapDoc;
    const colorOf = new Map(doc.nodes.map(n => [n.id, n.color]));
    return {
        nodes: doc.nodes.map(n => ({
            id: n.id, type: 'mind', position: { x: n.x, y: n.y },
            data: { text: n.text, color: n.color, ...callbacks },
        })),
        edges: doc.edges.map(e => ({
            id: e.id, source: e.source, target: e.target,
            style: edgeStyle(colorOf.get(e.source) ?? 'cyan'),
        })),
    };
}

function MindMapCanvas() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPaneClick = useRef(0);
    const { screenToFlowPosition } = useReactFlow();

    const callbacks = useMemo<Omit<MindNodeData, 'text' | 'color'>>(() => ({
        onEdit: (id, text) => setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, text } } : n))),
        onRecolor: (id, color) => {
            setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, color } } : n)));
            setEdges(eds => eds.map(e => (e.source === id ? { ...e, style: edgeStyle(color) } : e)));
        },
        onDelete: id => {
            setNodes(nds => nds.filter(n => n.id !== id));
            setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
        },
    }), []);

    const initial = useMemo(() => loadInitial(callbacks), []);
    const [nodes, setNodes, onNodesChange] = useNodesState<MindFlowNode>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

    useEffect(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const doc: MindMapDoc = {
                nodes: nodes.map((n): MindNode => ({ id: n.id, text: n.data.text, color: n.data.color, x: n.position.x, y: n.position.y })),
                edges: edges.map((e): MindEdge => ({ id: e.id, source: e.source, target: e.target })),
            };
            DB.save('mindmap', doc);
        }, 500);
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, [nodes, edges]);

    const addNodeAt = (x: number, y: number) => {
        const id = crypto.randomUUID();
        const jitter = () => Math.random() * 70 - 35;
        setNodes(nds => [...nds, {
            id, type: 'mind', position: { x: x + jitter(), y: y + jitter() },
            data: { text: 'Новая мысль', color: MIND_COLORS[nds.length % MIND_COLORS.length], ...callbacks },
        }]);
    };

    const addNodeCenter = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        const point = rect
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const flowPos = screenToFlowPosition(point);
        addNodeAt(flowPos.x, flowPos.y);
    };

    const onConnect = (connection: Connection) => {
        const source = nodes.find(n => n.id === connection.source);
        setEdges(eds => addEdge({ ...connection, id: crypto.randomUUID(), style: edgeStyle(source?.data.color ?? 'cyan') }, eds));
    };

    const onPaneClick = (event: React.MouseEvent) => {
        const now = Date.now();
        const isDoubleClick = now - lastPaneClick.current < 350;
        lastPaneClick.current = now;
        if (!isDoubleClick) return;
        const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        addNodeAt(flowPos.x, flowPos.y);
    };

    return (
        <div ref={wrapperRef} className="glass-card rounded-2xl relative" style={{ height: '75vh' }}>
            {nodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <p className="text-gray-500 text-center">
                        Пусто — нажми «+» или дважды кликни по холсту,<br />чтобы создать первую мысль.
                    </p>
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneClick={onPaneClick}
                nodeTypes={mindNodeTypes}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                fitView
                fitViewOptions={{ padding: 0.3 }}
                proOptions={{ hideAttribution: true }}
                className="rounded-2xl"
            >
                <Background gap={18} size={1} color="var(--border)" />
                <Controls showInteractive={false} />
            </ReactFlow>

            <button
                onClick={addNodeCenter}
                title="Добавить узел"
                className="absolute bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black flex items-center justify-center shadow-lg hover:scale-105 transition"
            >
                <Icon name="plus" size={20} />
            </button>
        </div>
    );
}

export function MindMap() {
    return (
        <div>
            <PageHeader page="mindmap" title="MindMap" subtitle="Свободная карта мыслей — своя, ни от чего не зависит" />
            <ReactFlowProvider>
                <MindMapCanvas />
            </ReactFlowProvider>
        </div>
    );
}
