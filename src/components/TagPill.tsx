type Props = { label: string; count?: number; tone: 'good' | 'bad' | 'neutral' };

/** Colored pill tag. `tone` is semantic, not decorative — good/bad drive the hue. */
export function TagPill({ label, count, tone }: Props) {
    const toneClass = tone === 'good'
        ? 'bg-success/10 text-success border-success/20'
        : tone === 'bad'
        ? 'bg-danger/10 text-danger border-danger/20'
        : 'bg-[var(--gq-surface-input)] text-[var(--gq-text-tertiary)] border-[var(--gq-border-default)]';

    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${toneClass}`}>
            {label}
            {count !== undefined && <span className="t-label normal-case tracking-normal px-1.5 rounded-full bg-black/20">{count}</span>}
        </span>
    );
}
