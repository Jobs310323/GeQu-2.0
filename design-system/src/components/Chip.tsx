import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    /** Tints the chip when it represents a selected/logged state — habit
     * ticks, helped/hindered tags, body-scan chips (Dashboard, UserCard). */
    active?: 'good' | 'bad' | false;
    children: ReactNode;
    className?: string;
};

/** The redesign's filter/toggle pill (`.gq-chip`) — literal CSS class, not reimplemented. */
export function Chip({ active = false, children, className = '', ...rest }: Props) {
    const activeClass = active === 'good' ? 'active-good' : active === 'bad' ? 'active-bad' : '';
    return (
        <button className={`gq-chip ${activeClass} ${className}`} {...rest}>
            {children}
        </button>
    );
}
