type Props = {
    /** 0-100. Values outside are clamped. */
    value: number;
    /** `gradient` = the app's violet→magenta fill (its most common bar, XP/goal/quiz progress).
     * `solid` = a flat tint (Knowledge read-progress, achievement bars).
     * Any CSS color = a one-off fill (MindMap node progress, colored by priority). */
    fill?: 'gradient' | 'solid' | string;
    height?: number;
    /** Track color class — defaults to the redesign's `.gq-track`; pass `bg-black/30` for the legacy look. */
    trackClassName?: string;
    className?: string;
};

/**
 * The single most duplicated pattern in the app (8+ independent hand-rolled
 * copies — GoalsList, Progress, ClinicalTests, Knowledge, MindMap, Snowman
 * all reimplement "track div + absolutely-widthed fill div"). One component.
 */
export function ProgressBar({ value, fill = 'gradient', height = 8, trackClassName = 'gq-track', className = '' }: Props) {
    const pct = Math.max(0, Math.min(100, value));
    const background =
        fill === 'gradient' ? 'linear-gradient(90deg, var(--gq-grad-a), var(--gq-grad-b))'
            : fill === 'solid' ? 'var(--gq-grad-a)'
                : fill;
    return (
        <div className={`w-full rounded-full overflow-hidden ${trackClassName} ${className}`} style={{ height }}>
            <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background, transition: 'width 0.4s ease' }}
            />
        </div>
    );
}
