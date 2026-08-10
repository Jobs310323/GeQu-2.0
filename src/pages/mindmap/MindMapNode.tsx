import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { Node, NodeProps } from '@xyflow/react';
import { Icon } from '../../components/Icons';
import type { MindColor } from '../../types/mindmap';
import { COLOR_DOT_CLASS, COLOR_HEX, COLOR_OUTLINE_CLASS, MIND_COLORS } from './colors';

export type MindNodeData = {
    text: string;
    color: MindColor;
    onEdit: (id: string, text: string) => void;
    onRecolor: (id: string, color: MindColor) => void;
    onDelete: (id: string) => void;
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

    return (
        <div className="group relative">
            <div className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 glass-card rounded-full px-1.5 py-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ${selected ? 'opacity-100' : ''}`}>
                {MIND_COLORS.map(c => (
                    <button key={c} onClick={() => data.onRecolor(id, c)} title={c}
                        className={`nodrag w-4 h-4 rounded-full ${COLOR_DOT_CLASS[c]} ${c === data.color ? 'outline outline-2 outline-offset-1 outline-[var(--text-main)]' : ''}`} />
                ))}
                <div className="w-px h-4 bg-[var(--border)] mx-0.5" />
                <button onClick={() => data.onDelete(id)} title="Удалить узел"
                    className="nodrag p-1 rounded-full text-[var(--text-muted)] hover:text-red-400 transition">
                    <Icon name="trash" size={12} />
                </button>
            </div>

            <div className={[
                'glass-card rounded-xl px-4 py-2.5 min-w-[140px] max-w-[240px] flex items-center gap-2 transition',
                selected ? `outline outline-2 outline-offset-2 ${COLOR_OUTLINE_CLASS[data.color]}` : '',
            ].join(' ')}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${COLOR_DOT_CLASS[data.color]}`} />
                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={e => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={e => {
                            if (e.key === 'Enter') commit();
                            if (e.key === 'Escape') setEditing(false);
                        }}
                        className="nodrag flex-1 bg-transparent border-b border-cyan-400 outline-none text-sm py-0.5 min-w-0"
                    />
                ) : (
                    <span onDoubleClick={startEdit} title="Двойной клик — изменить"
                        className="flex-1 text-sm text-[var(--text-main)] break-words">
                        {data.text}
                    </span>
                )}
            </div>

            {SIDES.map(position => <SideHandles key={position} position={position} color={data.color} />)}
        </div>
    );
}

export const mindNodeTypes = { mind: MindMapNode };
