import type { ReactNode } from 'react';

type DividerProps = { className?: string };

/** A hairline in the redesign's own divider color — `.gq-divider` sets `border-color` only, so pair it with a border-width utility (e.g. `border-t`). */
export function Divider({ className = '' }: DividerProps) {
    return <hr className={`gq-divider ${className}`} />;
}

type RowProps = { children: ReactNode; className?: string };

/** A list row with a bottom hairline that lights up on hover (`.gq-row`) — the divider/hover material under CalendarPage's reminder list and similar simple lists. */
export function Row({ children, className = '' }: RowProps) {
    return <div className={`gq-row ${className}`}>{children}</div>;
}
