import { Icon } from '../reexports';

export type TabStripItem = { id: string; label: string; icon?: string };

type Props = {
    items: TabStripItem[];
    value: string;
    onChange: (id: string) => void;
    /**
     * The app has four independently-coded tab strips doing the same job —
     * this is all four as one component:
     * `underline` — `.gq-tab` (Dashboard/UserCard's `GqTabs`), gradient bottom border.
     * `pill-tint` — the most common: Training/BrainIq/ClinicalTests/Gym/Snowman/Progress
     *   (`glass-card rounded-2xl p-1.5` strip, active = `bg-cyan-400/10 text-cyan-400`).
     * `pill-solid` — Finance/Dynamics (active = solid `bg-cyan-400 text-black`).
     * `pill-outline` — Cbt (`rounded-full` border pills, active = tinted border).
     */
    variant?: 'underline' | 'pill-tint' | 'pill-solid' | 'pill-outline';
    className?: string;
};

export function TabStrip({ items, value, onChange, variant = 'pill-tint', className = '' }: Props) {
    if (variant === 'underline') {
        return (
            <div className={`flex gap-[22px] ${className}`} style={{ borderBottom: '1px solid var(--gq-divider)' }}>
                {items.map(t => (
                    <button key={t.id} onClick={() => onChange(t.id)} className={`gq-tab ${value === t.id ? 'active' : ''}`}>
                        {t.icon && <Icon name={t.icon} size={15} />}
                        {t.label}
                    </button>
                ))}
            </div>
        );
    }

    const wrapClass = variant === 'pill-outline' ? `flex gap-2 flex-wrap ${className}` : `gq-glass rounded-2xl p-1.5 flex gap-1 flex-wrap ${className}`;
    return (
        <div className={wrapClass}>
            {items.map(t => {
                const active = value === t.id;
                const itemClass =
                    variant === 'pill-solid'
                        ? `px-3.5 py-1.5 rounded-xl text-sm font-bold transition ${active ? 'text-black' : 'gq-muted hover:bg-white/5'}`
                        : variant === 'pill-outline'
                            ? `px-3.5 py-1.5 rounded-full text-sm border transition ${active ? '' : 'border-[var(--gq-divider)] gq-muted hover:bg-white/5'}`
                            : `px-3.5 py-1.5 rounded-xl text-sm transition ${active ? '' : 'gq-muted hover:bg-white/5 hover:text-[var(--text-main)]'}`;
                const activeStyle = active
                    ? variant === 'pill-solid'
                        ? { background: 'var(--gq-grad-a)' }
                        : variant === 'pill-outline'
                            ? { background: 'color-mix(in srgb, var(--gq-grad-a) 10%, transparent)', borderColor: 'color-mix(in srgb, var(--gq-grad-a) 40%, transparent)', color: 'var(--gq-grad-a)' }
                            : { background: 'color-mix(in srgb, var(--gq-grad-a) 10%, transparent)', color: 'var(--gq-grad-a)' }
                    : undefined;
                return (
                    <button key={t.id} onClick={() => onChange(t.id)} className={itemClass} style={activeStyle}>
                        {t.icon && <Icon name={t.icon} size={14} className="inline mr-1.5 -mt-0.5" />}
                        {t.label}
                    </button>
                );
            })}
        </div>
    );
}
