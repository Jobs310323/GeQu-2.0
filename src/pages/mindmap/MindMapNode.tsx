import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Icon } from '../../components/Icons';
import type { MindColor, MindNode } from '../../types/mindmap';
import { COLOR_DOT_CLASS, COLOR_HEX, COLOR_OUTLINE_CLASS, MIND_COLORS, MIND_COLOR_LABEL, PRIORITY_HEX } from './colors';

// Every field a node carries (minus id/x/y, which xyflow tracks separately),
// plus values derived at render time (effectiveProgress, subtreeHours, ...)
// and the callbacks the canvas injects. Keeping this as an exact superset of
// MindNode (not a hand-picked subset) is what keeps this type assignable
// to/from the canvas's own stored-node type without casts.
export type MindNodeData = Omit<MindNode, 'id' | 'x' | 'y'> & {
    overdue: boolean;
    effectiveProgress: number;
    subtreeHours: number;
    hasChildren: boolean;
    tacticianMode: boolean;
    onEdit: (id: string, text: string) => void;
    onRecolor: (id: string, color: MindColor) => void;
    onDelete: (id: string) => void;
    onOpen: (id: string) => void;
    onSnooze: (id: string) => void;
    onToggleDone: (id: string) => void;
};

export type MindFlowNode = Node<MindNodeData, 'mind'>;

const SIDES = [Position.Top, Position.Right, Position.Bottom, Position.Left];

function SideHandles({ position, color }: { position: Position; color: MindColor }) {
    return (
        <>
            <Handle type="target" position={position} id={`${position}-target`}
                className="!w-3 !h-3 !bg-[var(--bg-input)] !border-2 !border-[var(--border)] opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={position} id={`${position}-source`}
                style={{ background: COLOR_HEX[color] }}
                className="!w-2.5 !h-2.5 !border-none opacity-0 group-hover:opacity-100 transition-opacity" />
        </>
    );
}

export function MindMapNode({ id, data, selected }: NodeProps<MindFlowNode>) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(data.text);

    const startEdit = () => { setDraft(data.text); setEditing(true); };
    const commit = () => {
        const text = draft.trim();
        if (text) data.onEdit(id, text);
        setEditing(false);
    };

    const displayProgress = data.hasChildren ? data.effectiveProgress : data.progress;

    return (
        <div className="group relative">
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 glass-card rounded-full px-1.5 py-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${selected ? 'opacity-100' : ''}`}>
                {MIND_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => data.onRecolor(id, c)}
                        aria-label={`Цвет: ${MIND_COLOR_LABEL[c]}`} aria-pressed={c === data.color}
                        className={`nodrag w-4 h-4 rounded-full ${COLOR_DOT_CLASS[c]} ${c === data.color ? 'outline outline-2 outline-offset-1 outline-[var(--text-main)]' : ''}`} />
                ))}
                <div className="w-px h-4 bg-[var(--border)] mx-0.5" />
                <button type="button" onClick={() => data.onDelete(id)} aria-label="Удалить узел"
                    className="nodrag p-1 rounded-full text-[var(--text-muted)] hover:text-red-400 transition">
                    <Icon name="trash" size={12} />
                </button>
            </div>

            {/* The card body opens the node's inspector, so it is a control, not
                a decorated div — as a <div onClick> it was unreachable by
                keyboard, which made the whole mind map mouse-only.
                `role="button"` rather than a real <button>: the card contains an
                <input> during inline rename, and an input inside a button is
                invalid HTML that browsers reparent. prefer-tag-over-role is a
                style preference; nesting-validity is not. */}
            {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role */}
            <div role="button" tabIndex={0}
                onClick={() => data.onOpen(id)}
                onKeyDown={e => {
                    if (e.target !== e.currentTarget) return;   // let the inline editor keep its keys
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); data.onOpen(id); }
                }}
                aria-label={`Открыть узел: ${data.text}`}
                style={{ borderLeft: `3px solid ${PRIORITY_HEX[data.priority]}` }}
                className={[
                    'glass-card rounded-xl pl-3 pr-4 py-2.5 min-w-[160px] max-w-[240px] flex flex-col gap-1.5 transition cursor-pointer',
                    selected ? `outline outline-2 outline-offset-2 ${COLOR_OUTLINE_CLASS[data.color]}` : '',
                    data.overdue ? 'outline outline-2 outline-offset-2 outline-red-400 animate-pulse' : '',
                ].join(' ')}
            >
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASS[data.color]}`} />
                    {data.isMilestone && <span aria-label="Веха" title="Веха">🏆</span>}
                    {editing ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={commit}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commit();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            className="nodrag flex-1 bg-transparent border-b border-cyan-400 outline-none text-sm py-0.5 min-w-0"
                        />
                    ) : (
                        <span onDoubleClick={e => { e.stopPropagation(); startEdit(); }} title="Двойной клик — изменить"
                            className="flex-1 text-sm text-[var(--text-main)] break-words">
                            {data.text}
                            {data.hasChildren && data.subtreeHours > 0 && (
                                <span className="text-[var(--text-muted)] font-normal"> ({data.subtreeHours}ч)</span>
                            )}
                        </span>
                    )}
                    {data.tacticianMode && (
                        <button
                            onClick={e => { e.stopPropagation(); data.onToggleDone(id); }}
                            title="Отметить выполненным"
                            className={`nodrag shrink-0 w-4 h-4 rounded border flex items-center justify-center ${data.status === 'done' ? 'bg-green-400 border-green-400 text-black' : 'border-[var(--border)]'}`}
                        >
                            {data.status === 'done' && <Icon name="check" size={11} />}
                        </button>
                    )}
                </div>

                <div className="h-1 rounded-full bg-[var(--bg-input)] overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${displayProgress}%`, background: PRIORITY_HEX[data.priority] }} />
                </div>

                {data.overdue && (
                    <button
                        onClick={e => { e.stopPropagation(); data.onSnooze(id); }}
                        className="nodrag self-start flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300"
                    >
                        <Icon name="clock" size={11} /> Отложить
                    </button>
                )}
            </div>

            {SIDES.map(position => <SideHandles key={position} position={position} color={data.color} />)}
        </div>
    );
}

export const mindNodeTypes = { mind: MindMapNode };
