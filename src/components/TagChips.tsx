import { useState } from 'react';
import { Icon } from './Icons';

type Props = {
    tags: string[];
    onChange: (tags: string[]) => void;
    className?: string;
};

/** Compact tag editor — pill chips with a remove ×, plus an inline add field. Used by both goals and steps. */
export function TagChips({ tags, onChange, className = '' }: Props) {
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');

    const addTag = () => {
        const t = draft.trim();
        if (t && !tags.includes(t)) onChange([...tags, t]);
        setDraft('');
        setAdding(false);
    };
    const removeTag = (t: string) => onChange(tags.filter(x => x !== t));

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {tags.map(t => (
                <span key={t} className="flex items-center gap-1 bg-purple-400/10 text-purple-400 text-xs rounded-full pl-2.5 pr-1.5 py-0.5">
                    {t}
                    <button onClick={() => removeTag(t)} title="Убрать тег" className="hover:text-red-400 transition">
                        <Icon name="close" size={10} />
                    </button>
                </span>
            ))}
            {adding ? (
                <input
                    autoFocus
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onBlur={addTag}
                    onKeyDown={e => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') { setDraft(''); setAdding(false); } }}
                    placeholder="тег…"
                    className="w-20 bg-transparent border-b border-purple-400 outline-none text-xs py-0.5"
                />
            ) : (
                <button onClick={() => setAdding(true)} title="Добавить тег"
                    className="flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-purple-400 transition">
                    <Icon name="plus" size={10} /> тег
                </button>
            )}
        </div>
    );
}
