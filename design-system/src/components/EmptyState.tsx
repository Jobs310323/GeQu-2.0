import type { ReactNode } from 'react';
import { IconBadge } from './IconBadge';

type Props = {
    icon?: string;
    message: string;
    action?: ReactNode;
    className?: string;
};

/**
 * "Nothing here yet" — 12+ bespoke one-line renders across the app (Habits,
 * Goals, Gym's history/PR/AI panels, UserCard, Dynamics, ClinicalTests,
 * Snowman, MindMap's canvas placeholder). This is the shared shape: an
 * optional icon badge, one muted line, an optional call to action.
 */
export function EmptyState({ icon, message, action, className = '' }: Props) {
    return (
        <div className={`flex flex-col items-center justify-center text-center gap-3 py-10 ${className}`}>
            {icon && <IconBadge icon={icon} tone="muted" boxSize={48} />}
            <p className="text-sm gq-muted">{message}</p>
            {action}
        </div>
    );
}
