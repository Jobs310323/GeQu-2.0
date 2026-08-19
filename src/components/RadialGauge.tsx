type Props = {
    value: number;
    max?: number;
    label: string;
    size?: number;
    /** Ring thickness. The checkin energy ring is thinner (6) than the stat gauges. */
    stroke?: number;
    /** Coloured halo behind the arc, as on the checkin energy ring. */
    glow?: boolean;
    color?: string;
};

/** Circular progress gauge — ported from the concept-v2 design pass, retheme'd onto CSS vars. */
export function RadialGauge({ value, max = 10, label, size = 88, stroke = 8, glow = false, color = 'var(--accent-cyan)' }: Props) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / max));
    const offset = c * (1 - pct);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke={color} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={offset}
                        style={{
                            transition: 'stroke-dashoffset 0.6s ease',
                            filter: glow ? `drop-shadow(0 0 5px ${color})` : undefined,
                        }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="gq-display text-lg font-bold text-[var(--text-main)]">{value.toFixed(1)}</span>
                </div>
            </div>
            {label && <span className="text-xs text-[var(--text-muted)]">{label}</span>}
        </div>
    );
}
