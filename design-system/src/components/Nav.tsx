import { useState } from 'react';
import type { ReactNode } from 'react';
import { Icon } from '../reexports';

type NavItemProps = {
    icon: string;
    label: string;
    active?: boolean;
    /** Small count pill, e.g. a reminder count. */
    badge?: string | number;
    onClick?: () => void;
};

/** One sidebar row (`.gq-item`/`.gq-nav`) — active state is the violet wash + hairline, `color-mix` off the accent so light mode gets a darker wash for free. */
export function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
    return (
        <button onClick={onClick} className={`gq-item gq-nav ${active ? 'active' : ''}`}>
            <Icon name={icon} size={15} />
            <span className="flex-1 text-left">{label}</span>
            {badge !== undefined && (
                <span className="gq-pill" style={{ background: 'var(--gq-chip-bg)', color: 'var(--gq-text-2)' }}>{badge}</span>
            )}
        </button>
    );
}

type NavGroupProps = {
    title: string;
    icon: string;
    open: boolean;
    onToggle: () => void;
    /** The group holding the current page — stays legible while closed (`.holds`). */
    holds?: boolean;
    children: ReactNode;
};

/** One accordion group in the expanded sidebar — the group header (`.gq-group-head`) plus its 0fr→1fr panel (`.gq-acc`) of `NavItem`s, indented on a hairline (`.gq-sub`). */
export function NavGroup({ title, icon, open, onToggle, holds, children }: NavGroupProps) {
    return (
        <div>
            <button onClick={onToggle} className={`gq-group-head ${holds ? 'holds' : ''}`}>
                <Icon name={icon} size={14} />
                <span className="gq-group-title flex-1 text-left">{title}</span>
                <Icon name="chevronDown" size={12} className={`gq-caret ${open ? 'open' : ''}`} />
            </button>
            <div className="gq-acc" data-open={open}>
                <div style={{ overflow: 'hidden' }}>
                    <div className="gq-sub">{children}</div>
                </div>
            </div>
        </div>
    );
}

type NavRailGlyphProps = {
    icon: string;
    active?: boolean;
    /** Something waiting in this (closed) group. */
    dot?: boolean;
    /** Flyout content shown on hover — the collapsed rail's way of surfacing a group's items beside the glyph. */
    flyout?: ReactNode;
    onClick?: () => void;
};

/** One glyph in the collapsed ("rail") sidebar — hover reveals its group's items in a floating panel (`.gq-flyout`) beside it. */
export function NavRailGlyph({ icon, active, dot, flyout, onClick }: NavRailGlyphProps) {
    const [hover, setHover] = useState(false);
    return (
        <div className="relative" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <button onClick={onClick} className={`gq-glyph gq-nav ${active ? 'active' : ''}`}>
                <Icon name={icon} size={16} />
                {dot && <span className="gq-dot" />}
            </button>
            {flyout && hover && <div className="gq-flyout gq-glass">{flyout}</div>}
        </div>
    );
}
