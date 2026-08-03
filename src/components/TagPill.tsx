type Props = { label: string; count?: number; tone: 'good' | 'bad' | 'neutral' };

/** Colored pill tag — ported from the concept-v2 design pass. */
export function TagPill({ label, count, tone }: Props) {
    const toneClass = tone === 'good'
        ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
        : tone === 'bad'
        ? 'bg-rose-400/10 text-rose-400 border-rose-400/20'
        : 'bg-[var(--bg-input)] text-[var(--text-muted)] border-[var(--border)]';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${toneClass}`}>
            {label}
            {count !== undefined && <span className="text-[10px] px-1.5 rounded-full bg-black/20">{count}</span>}
        </span>
    );
}
