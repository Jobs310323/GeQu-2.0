import { Icon } from '../reexports';

type Props = {
    icon?: string;
    label: string;
    value: string | number;
    hint?: string;
    /** Signed delta row, e.g. Dynamics' ▲/▼ change-vs-last-period. */
    delta?: { value: string | number; trend: 'up' | 'down' };
    tone?: 'good' | 'bad' | 'neutral';
    onClick?: () => void;
    className?: string;
};

/**
 * The numeric KPI tile — six independent hand-rolled versions found across
 * Dashboard, UserCard, WeekSummary, Dynamics, Progress and UnifiedStats, all
 * doing "icon + label, big number, optional hint or signed delta" on a
 * `.gq-stat` surface. One component, `onClick` makes it a button when a tile
 * is also a filter (as on Dashboard).
 */
export function StatTile({ icon, label, value, hint, delta, tone = 'neutral', onClick, className = '' }: Props) {
    const Tag = onClick ? 'button' : 'div';
    const deltaColor = delta ? (delta.trend === 'up' ? 'var(--gq-good)' : 'var(--gq-bad)') : undefined;
    const toneColor = tone === 'good' ? 'var(--gq-good)' : tone === 'bad' ? 'var(--gq-bad)' : undefined;
    return (
        <Tag onClick={onClick} className={`gq-stat text-left flex flex-col gap-1 ${onClick ? 'cursor-pointer hover:bg-[var(--gq-chip-hover)] transition' : ''} ${className}`}>
            <div className="flex items-center gap-1.5 text-xs gq-muted">
                {icon && <Icon name={icon} size={13} />}
                {label}
            </div>
            <div className="gq-display text-xl font-bold" style={{ color: toneColor }}>{value}</div>
            {hint && <div className="text-xs gq-muted">{hint}</div>}
            {delta && (
                <div className="flex items-center gap-1 text-xs font-medium" style={{ color: deltaColor }}>
                    <Icon name={delta.trend === 'up' ? 'trendUp' : 'trendDown'} size={12} />
                    {delta.value}
                </div>
            )}
        </Tag>
    );
}
