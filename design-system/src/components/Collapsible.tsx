import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../reexports';

type Props = {
    title: string;
    icon?: string;
    /** One-line live summary shown next to the title while collapsed (Dashboard's Section). */
    summary?: ReactNode;
    defaultOpen?: boolean;
    children: ReactNode;
    className?: string;
};

/**
 * A collapsible section using the sidebar's own 0fr→1fr grid technique
 * (`.gq-acc`, animates to the content's real height, no max-height guess).
 * Three independent hand-rolled versions of this exist (Dashboard's Section,
 * GoalsList's GoalCard, the Sidebar itself) — this is the general-purpose one.
 */
export function Collapsible({ title, icon, summary, defaultOpen = false, children, className = '' }: Props) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className={className}>
            <button type="button" onClick={() => setOpen(o => !o)} className="gq-group-head w-full">
                {icon && <Icon name={icon} size={15} />}
                <span className="flex-1 text-left">{title}</span>
                {!open && summary}
                <Icon name="chevronDown" size={14} className={`gq-caret ${open ? 'open' : ''}`} />
            </button>
            <div className="gq-acc" data-open={open}>
                <div style={{ overflow: 'hidden' }}>{children}</div>
            </div>
        </div>
    );
}
