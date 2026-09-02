import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icons';

type Props = {
    tags: string[];
    onChange: (tags: string[]) => void;
    className?: string;
};

/** Compact tag editor — pill chips with a remove ×, plus an inline add field. Used by both goals and steps. */
export function TagChips({ tags, onChange, className = '' }: Props) {
    const { t } = useTranslation('common');
    const [adding, setAdding] = useState(false);
    const [draft, setDraft] = useState('');

    const addTag = () => {
        const tag = draft.trim();
        if (tag && !tags.includes(tag)) onChange([...tags, tag]);
        setDraft('');
        setAdding(false);
    };
    const removeTag = (tag: string) => onChange(tags.filter(x => x !== tag));

    return (
        <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
            {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-purple-400/10 text-purple-400 text-xs rounded-full pl-2.5 pr-1.5 py-0.5">
                    {tag}
                    <button onClick={() => removeTag(tag)} title={t('common:tag.remove')} className="hover:text-red-400 transition">
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
                    placeholder={t('common:tag.placeholder')}
                    className="w-20 bg-transparent border-b border-purple-400 outline-none text-xs py-0.5"
                />
            ) : (
                <button onClick={() => setAdding(true)} title={t('common:tag.add')}
                    className="flex items-center gap-0.5 text-xs text-[var(--text-muted)] hover:text-purple-400 transition">
                    <Icon name="plus" size={10} /> {t('common:tag.short')}
                </button>
            )}
        </div>
    );
}
