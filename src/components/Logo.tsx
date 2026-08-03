/**
 * GeQu mark: a hexagon (the app's ⬢ motif) drawn as a single open stroke that
 * breaks at the top-right and continues into an upward tick — the interrupted
 * loop of an ADHD day, resolving into progress. Inner dot is the point of focus.
 *
 * Monochrome by design: one path, no fills, no gradient, so it inherits
 * currentColor and reads the same in both themes and at 16px.
 */
export function LogoMark({ size = 28, className = '' }: { size?: number; className?: string }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none"
            className={className} aria-hidden="true">
            {/* Open hexagon: starts top-centre, runs anticlockwise, stops short */}
            <path
                d="M16 3.5 L5.5 9.5 L5.5 22.5 L16 28.5 L26.5 22.5 L26.5 13"
                stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round"
            />
            {/* The break resolving upward */}
            <path
                d="M22 8.5 L26.5 4 L31 8.5"
                stroke="currentColor" strokeWidth="2.4"
                strokeLinecap="round" strokeLinejoin="round"
                transform="translate(-4.5 1.5) scale(0.78) translate(6.5 2)"
            />
            {/* Point of focus */}
            <circle cx="16" cy="16" r="3" fill="currentColor" />
        </svg>
    );
}

/** Mark plus wordmark, used in the sidebar header. */
export function Logo({ compact = false }: { compact?: boolean }) {
    return (
        <span className="flex items-center gap-2 select-none text-[var(--text-main)]">
            <LogoMark size={compact ? 26 : 24} />
            {!compact && (
                <span className="text-xl font-semibold tracking-tight">GeQu</span>
            )}
        </span>
    );
}
