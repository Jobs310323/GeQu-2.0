import { useEffect, useMemo, useRef, useState } from 'react';
import {
    addEdge, Background, Controls, ReactFlow, ReactFlowProvider,
    useEdgesState, useNodesState, useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { DB } from '../lib/db';
import {
    buildChildrenMap, computeDepths, computeEffectiveProgress, computeSubtreeHours,
    createNode, isOverdue, normalizeNode,
} from '../lib/mindTree';
import { generateWeeklyReport } from './mindmap/analytics';
import { exportWeekCsv } from './mindmap/export';
import { COLOR_HEX, MIND_COLORS } from './mindmap/colors';
import { mindNodeTypes } from './mindmap/MindMapNode';
import { NodeInspector } from './mindmap/NodeInspector';
import type { MindColor, MindEdge, MindMapDoc, MindNode, MindViewMode } from '../types/mindmap';
import type { MindFlowNode, MindNodeData } from './mindmap/MindMapNode';
import { todayKey, toLocalDateKey, addDays, nowInstant } from '../lib/datetime';

type Callbacks = Pick<MindNodeData, 'onEdit' | 'onRecolor' | 'onDelete' | 'onOpen' | 'onSnooze' | 'onToggleDone'>;
type StoredData = Omit<MindNode, 'id' | 'x' | 'y'> & Callbacks;
type StoredFlowNode = Node<StoredData, 'mind'>;

function edgeStyle(color: MindColor): Edge['style'] {
    return { stroke: COLOR_HEX[color], strokeWidth: 1.75 };
}

function stripDomain(d: MindNode): Omit<MindNode, 'id' | 'x' | 'y'> {
    const { id: _id, x: _x, y: _y, ...rest } = d;
    return rest;
}

function toDomainNode(n: StoredFlowNode): MindNode {
    const { onEdit: _e, onRecolor: _r, onDelete: _d, onOpen: _o, onSnooze: _s, onToggleDone: _t, ...rest } = n.data;
    return { id: n.id, x: n.position.x, y: n.position.y, ...rest };
}

function loadInitial(callbacks: Callbacks): { nodes: StoredFlowNode[]; edges: Edge[] } {
    const doc = DB.get('mindmap', { nodes: [], edges: [] }) as MindMapDoc;
    const colorOf = new Map(doc.nodes.map(n => [n.id, n.color]));
    return {
        nodes: doc.nodes.map(raw => {
            const n = normalizeNode(raw);
            return {
                id: n.id, type: 'mind', position: { x: n.x, y: n.y },
                data: { ...stripDomain(n), ...callbacks },
            };
        }),
        edges: doc.edges.map(e => ({
            id: e.id, source: e.source, target: e.target,
            sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined,
            style: edgeStyle(colorOf.get(e.source) ?? 'cyan'),
        })),
    };
}

const VIEW_MODES: { id: MindViewMode; label: string; hint: string }[] = [
    { id: 'normal', label: 'Обычный', hint: 'Все узлы' },
    { id: 'strategist', label: 'Стратег', hint: 'Только первые 2 уровня' },
    { id: 'tactician', label: 'Тактик', hint: 'Только незакрытые листья, чекбоксами' },
    { id: 'blindspot', label: 'Слепое пятно', hint: 'Только застрявшее (<70%)' },
];

function MindMapCanvas() {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastPaneClick = useRef(0);
    const inspectorSession = useRef<{ id: string; start: number } | null>(null);
    const { screenToFlowPosition } = useReactFlow();

    const [viewMode, setViewMode] = useState<MindViewMode>('normal');
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [inboxOpen, setInboxOpen] = useState(false);
    const [inboxDraft, setInboxDraft] = useState('');

    const commitTimeSpent = (nodeId: string | null) => {
        if (!inspectorSession.current || inspectorSession.current.id !== nodeId) return;
        const minutes = Math.round((Date.now() - inspectorSession.current.start) / 60000);
        if (minutes > 0) {
            setNodes(nds => nds.map(n => (n.id === nodeId
                ? { ...n, data: { ...n.data, timeSpentTotal: n.data.timeSpentTotal + minutes } }
                : n)));
        }
        inspectorSession.current = null;
    };

    const callbacks = useMemo<Callbacks>(() => ({
        onEdit: (id, text) => setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, text } } : n))),
        onRecolor: (id, color) => {
            setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, color } } : n)));
            setEdges(eds => eds.map(e => (e.source === id ? { ...e, style: edgeStyle(color) } : e)));
        },
        onDelete: id => {
            setNodes(nds => nds.filter(n => n.id !== id));
            setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
            setSelectedNodeId(sel => (sel === id ? null : sel));
        },
        onOpen: id => {
            commitTimeSpent(selectedNodeId);
            inspectorSession.current = { id, start: Date.now() };
            setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, lastOpenedAt: nowInstant() } } : n)));
            setSelectedNodeId(id);
        },
        onSnooze: id => setNodes(nds => nds.map(n => {
            if (n.id !== id) return n;
            const from = n.data.dueDate ? toLocalDateKey(n.data.dueDate) : todayKey();
            return { ...n, data: { ...n.data, dueDate: addDays(from, 1), updatedAt: nowInstant() } };
        })),
        onToggleDone: id => setNodes(nds => nds.map(n => {
            if (n.id !== id) return n;
            const nowDone = n.data.status !== 'done';
            return { ...n, data: { ...n.data, status: nowDone ? 'done' : 'in_progress', progress: nowDone ? 100 : n.data.progress, updatedAt: nowInstant() } };
        })),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), []);

    const initial = useMemo(() => loadInitial(callbacks), []);
    const [nodes, setNodes, onNodesChange] = useNodesState<StoredFlowNode>(initial.nodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

    useEffect(() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const doc: MindMapDoc = {
                nodes: nodes.map(toDomainNode),
                edges: edges.map((e): MindEdge => ({
                    id: e.id, source: e.source, target: e.target,
                    sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
                })),
            };
            DB.save('mindmap', doc);
        }, 500);
        return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
    }, [nodes, edges]);

    const domainNodes = useMemo(() => nodes.map(toDomainNode), [nodes]);
    const domainEdges = useMemo<MindEdge[]>(() => edges.map(e => ({ id: e.id, source: e.source, target: e.target })), [edges]);
    const childrenMap = useMemo(() => buildChildrenMap(domainEdges), [domainEdges]);
    const depths = useMemo(() => computeDepths(domainNodes, domainEdges), [domainNodes, domainEdges]);
    const effectiveProgress = useMemo(() => computeEffectiveProgress(domainNodes, domainEdges), [domainNodes, domainEdges]);
    const subtreeHours = useMemo(() => computeSubtreeHours(domainNodes, domainEdges), [domainNodes, domainEdges]);

    const visibleIds = useMemo<Set<string> | null>(() => {
        if (viewMode === 'normal') return null;
        if (viewMode === 'strategist') {
            return new Set(domainNodes.filter(n => (depths.get(n.id) ?? 0) <= 1).map(n => n.id));
        }
        if (viewMode === 'tactician') {
            return new Set(domainNodes.filter(n => !childrenMap.has(n.id) && n.status !== 'done').map(n => n.id));
        }
        // blindspot
        return new Set(domainNodes.filter(n => (effectiveProgress.get(n.id) ?? n.progress) <= 70).map(n => n.id));
    }, [viewMode, domainNodes, depths, childrenMap, effectiveProgress]);

    const displayNodes = useMemo<MindFlowNode[]>(() => {
        const source = visibleIds ? nodes.filter(n => visibleIds.has(n.id)) : nodes;
        return source.map(n => {
            const domain = toDomainNode(n);
            return {
                ...n,
                data: {
                    ...n.data,
                    effectiveProgress: effectiveProgress.get(n.id) ?? n.data.progress,
                    subtreeHours: subtreeHours.get(n.id) ?? 0,
                    hasChildren: childrenMap.has(n.id),
                    overdue: isOverdue(domain),
                    tacticianMode: viewMode === 'tactician',
                },
            } as MindFlowNode;
        });
    }, [nodes, visibleIds, effectiveProgress, subtreeHours, childrenMap, viewMode]);

    const displayEdges = useMemo(() => {
        if (!visibleIds) return edges;
        return edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
    }, [edges, visibleIds]);

    const addNodeAt = (text: string, x: number, y: number) => {
        const jitter = () => Math.random() * 70 - 35;
        setNodes(nds => {
            const domain = createNode(text, x + jitter(), y + jitter(), MIND_COLORS[nds.length % MIND_COLORS.length]);
            return [...nds, { id: domain.id, type: 'mind', position: { x: domain.x, y: domain.y }, data: { ...stripDomain(domain), ...callbacks } }];
        });
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
        addNodeAt('Новая мысль', flowPos.x, flowPos.y);
    };

    const captureToInbox = () => {
        const text = inboxDraft.trim();
        if (!text) return;
        const rect = wrapperRef.current?.getBoundingClientRect();
        const point = rect
            ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const flowPos = screenToFlowPosition(point);
        const jitter = () => Math.random() * 70 - 35;
        setNodes(nds => {
            const domain = createNode(text, flowPos.x + jitter(), flowPos.y + jitter(), 'yellow');
            return [...nds, { id: domain.id, type: 'mind', position: { x: domain.x, y: domain.y }, data: { ...stripDomain(domain), status: 'backlog', ...callbacks } }];
        });
        setInboxDraft('');
        setInboxOpen(false);
    };

    const closeInspector = () => {
        commitTimeSpent(selectedNodeId);
        setSelectedNodeId(null);
    };

    const patchNode = (id: string, patch: Partial<MindNode>) => {
        const withProgress = patch.status === 'done' && patch.progress === undefined ? { ...patch, progress: 100 } : patch;
        setNodes(nds => nds.map(n => (n.id === id ? { ...n, data: { ...n.data, ...withProgress } } : n)));
    };

    const selectedDomain = selectedNodeId ? domainNodes.find(n => n.id === selectedNodeId) ?? null : null;

    return (
        <div>
            <PageHeader page="mindmap" title="MindMap" subtitle="Свободная карта мыслей — своя, ни от чего не зависит"
                action={<MindMapHeaderActions viewMode={viewMode} setViewMode={setViewMode}
                    onAnalytics={() => setShowAnalytics(true)}
                    onExport={() => exportWeekCsv(domainNodes, domainEdges)} />} />
            <div className="flex gap-4 items-start">
            <div ref={wrapperRef} className="glass-card rounded-2xl relative flex-1" style={{ height: '75vh' }}>
                {nodes.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <p className="text-gray-500 text-center">
                            Пусто — нажми «+» или дважды кликни по холсту,<br />чтобы создать первую мысль.
                        </p>
                    </div>
                )}
                <ReactFlow
                    nodes={displayNodes}
                    edges={displayEdges}
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

                {inboxOpen && (
                    <div className="absolute bottom-24 right-6 z-20 glass-card rounded-xl p-2 flex items-center gap-2 w-72">
                        <input
                            autoFocus
                            value={inboxDraft}
                            onChange={e => setInboxDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') captureToInbox(); if (e.key === 'Escape') setInboxOpen(false); }}
                            placeholder="Быстрая мысль в Inbox…"
                            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-main)] min-w-0"
                        />
                        <button onClick={captureToInbox} className="shrink-0 text-cyan-400 hover:text-cyan-300">
                            <Icon name="check" size={16} />
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setInboxOpen(v => !v)}
                    title="Быстрый захват (Inbox)"
                    className="absolute bottom-6 right-6 z-20 w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black flex items-center justify-center shadow-lg hover:scale-105 transition"
                >
                    <Icon name="plus" size={20} />
                </button>
            </div>

            {selectedDomain && (
                <NodeInspector
                    node={selectedDomain}
                    hasChildren={childrenMap.has(selectedDomain.id)}
                    effectiveProgress={effectiveProgress.get(selectedDomain.id) ?? selectedDomain.progress}
                    subtreeHours={subtreeHours.get(selectedDomain.id) ?? 0}
                    onPatch={patchNode}
                    onClose={closeInspector}
                />
            )}

            {showAnalytics && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowAnalytics(false)}>
                    <div className="glass-card rounded-2xl p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-semibold text-[var(--text-main)]">Итог за неделю</h3>
                            <button onClick={() => setShowAnalytics(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                                <Icon name="close" size={16} />
                            </button>
                        </div>
                        <ul className="space-y-2 text-sm text-[var(--text-main)]">
                            {generateWeeklyReport(domainNodes).map((line, i) => <li key={i}>{line}</li>)}
                        </ul>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
}

function MindMapHeaderActions({ viewMode, setViewMode, onAnalytics, onExport }: {
    viewMode: MindViewMode; setViewMode: (m: MindViewMode) => void; onAnalytics: () => void; onExport: () => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 glass-card rounded-full p-1">
                {VIEW_MODES.map(m => (
                    <button key={m.id} onClick={() => setViewMode(m.id)} title={m.hint}
                        className={`px-3 py-1 rounded-full text-xs transition ${viewMode === m.id ? 'bg-cyan-400 text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                        {m.label}
                    </button>
                ))}
            </div>
            <button onClick={onAnalytics} className="glass-card rounded-full px-3 py-1.5 text-xs text-[var(--text-main)] flex items-center gap-1.5 hover:text-cyan-400">
                <Icon name="chart" size={14} /> Итог
            </button>
            <button onClick={onExport} className="glass-card rounded-full px-3 py-1.5 text-xs text-[var(--text-main)] flex items-center gap-1.5 hover:text-cyan-400">
                <Icon name="download" size={14} /> Экспорт недели
            </button>
        </div>
    );
}

export function MindMap() {
    return (
        <ReactFlowProvider>
            <MindMapCanvas />
        </ReactFlowProvider>
    );
}
