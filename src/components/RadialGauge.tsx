type Props = {
    value: number;
    max?: number;
    label: string;
    size?: number;
    color?: string;
};

/** Circular progress gauge. Value renders in tabular figures so it does not
 *  reflow as the number ticks between widths. */
export function RadialGauge({ value, max = 10, label, size = 88, color = 'var(--gq-accent-surface)' }: Props) {
    const stroke = 8;
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, value / max));
    const offset = c * (1 - pct);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="-rotate-90">
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gq-border-default)" strokeWidth={stroke} />
                    <circle
                        cx={size / 2} cy={size / 2} r={r} fill="none"
                        stroke={color} strokeWidth={stroke} strokeLinecap="round"
                        strokeDasharray={c} strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset var(--gq-duration-slow) var(--gq-ease-standard)' }}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="t-metric text-lg text-[var(--gq-text-primary)]">{value.toFixed(1)}</span>
                </div>
            </div>
            <span className="t-caption">{label}</span>
        </div>
    );
}
