import type { ReactNode } from 'react';

type Props = {
    /** Leading slot — icon-in-circle, checkbox, or drag handle. */
    leading?: ReactNode;
    children: ReactNode;
    /** Trailing slot — action buttons, amount, chevrons. */
    trailing?: ReactNode;
    onClick?: () => void;
    className?: string;
};

/**
 * The "row on a tinted surface" shape reused, hand-built, in 8+ places —
 * Kanban cards, Diary entries, Finance's Debt/Subscription rows, StepRow,
 * Knowledge cards, CBT records. Same three-slot layout every time: leading
 * icon/checkbox, flexible middle content, trailing actions.
 */
export function ListItemRow({ leading, children, trailing, onClick, className = '' }: Props) {
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag
            onClick={onClick}
            className={`w-full flex items-center gap-3 bg-[var(--bg-input)] p-3 rounded-lg border border-[var(--border)] text-left ${onClick ? 'hover:bg-[var(--gq-row-hover)] transition cursor-pointer' : ''} ${className}`}
        >
            {leading}
            <div className="flex-1 min-w-0">{children}</div>
            {trailing}
        </Tag>
    );
}
