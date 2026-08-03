import type { ReactNode } from 'react';
import { Icon } from './Icons';

type Props = {
    title?: string;
    icon?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
};

/** Shared bento-grid card surface — ported from the concept-v2 design pass. */
export function BentoCard({ title, icon, action, children, className = '' }: Props) {
    return (
        <div className={`glass-card rounded-2xl p-4 flex flex-col gap-3 ${className}`}>
            {(title || action) && (
                <div className="flex items-center gap-2">
                    {icon && <Icon name={icon} size={14} className="text-[var(--text-muted)]" />}
                    {title && (
                        <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)] flex-1">
                            {title}
                        </h3>
                    )}
                    {action}
                </div>
            )}
            {children}
        </div>
    );
}
