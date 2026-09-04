import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
    /**
     * `glass` — the redesign surface (`.gq-glass`, `border-radius:22px`),
     * used on Dashboard/UserCard/BrainIq/ErrorBoundary.
     * `legacy` — `.glass-card`, the surface every pre-redesign page uses
     * (Finance, Kanban, Goals, Habits, Diary, ClinicalTests, Gym, Snowman…).
     * Same tokens under the hood, no radius baked in — the ~17 legacy pages
     * layer their own `rounded-xl`/`rounded-2xl`/`rounded-3xl` on top, so this
     * component defaults to none and expects the caller to add one.
     */
    variant?: 'glass' | 'legacy';
    children: ReactNode;
    className?: string;
};

/** The app's one card surface, in its two real skins. See `variant` for which to reach for. */
export function Card({ variant = 'glass', children, className = '', ...rest }: Props) {
    const base = variant === 'glass' ? 'gq-glass' : 'glass-card';
    return (
        <div className={`${base} ${className}`} {...rest}>
            {children}
        </div>
    );
}
