import type { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    level?: 1 | 2 | 3;
    /** Manrope instead of the body's Inter — headings and big numerals use it throughout. */
    display?: boolean;
    className?: string;
};

const SIZE: Record<1 | 2 | 3, string> = { 1: 'text-[26px]', 2: 'text-[23px]', 3: 'text-lg' };

/** The gradient-clipped heading text (`.gq-heading`) — every page title and big numeral in the redesign. */
export function Heading({ children, level = 1, display = true, className = '' }: Props) {
    const Tag = (`h${level}` as const);
    return (
        <Tag className={`gq-heading ${display ? 'gq-display' : ''} ${SIZE[level]} font-bold leading-tight ${className}`}>
            {children}
        </Tag>
    );
}
