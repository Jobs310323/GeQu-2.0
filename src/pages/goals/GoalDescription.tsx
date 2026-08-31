import { useState } from 'react';
import { Icon } from '../../components/Icons';
import { CollapsibleMarkdown, autoGrow } from '../../components/CollapsibleMarkdown';

type Props = {
    description?: string | undefined;
    onSave: (description: string) => void;
};

export function GoalDescription({ description, onSave }: Props) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(description ?? '');
    const hasDescription = Boolean(description?.trim());

    const startEdit = () => { setDraft(description ?? ''); setEditing(true); };
    const commit = () => { onSave(draft); setEditing(false); };

    if (editing) {
        return (
            <div className="mb-4">
                <textarea
                    autoFocus
                    value={draft}
                    onChange={e => { setDraft(e.target.value); autoGrow(e.target); }}
                    onFocus={e => autoGrow(e.target)}
                    onBlur={commit}
                    onKeyDown={e => { if (e.key === 'Escape') setEditing(false); }}
                    placeholder="Описание цели… (поддерживает Markdown)"
                    rows={3}
                    className="w-full bg-black/20 border border-[var(--border)] rounded-lg p-3 text-sm outline-none focus:border-cyan-400 resize-none overflow-hidden"
                />
            </div>
        );
    }

    if (!hasDescription) {
        return (
            <button onClick={startEdit} className="mb-4 flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-cyan-400 transition">
                <Icon name="edit" size={12} /> Добавить описание
            </button>
        );
    }

    return (
        <div className="mb-4 glass-card rounded-xl p-3">
            <div className="flex items-start justify-between gap-2">
                <CollapsibleMarkdown text={description ?? ''} collapsedHeight={120} className="flex-1" />
                <button onClick={startEdit} title="Изменить описание"
                    className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-400 transition">
                    <Icon name="edit" size={14} />
                </button>
            </div>
        </div>
    );
}
