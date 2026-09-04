import { useEffect } from 'react';
import type { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    /** ms before onDismiss fires; 0 disables the auto-timer (caller controls lifetime). */
    duration?: number;
    onDismiss?: () => void;
    tone?: 'default' | 'good';
    className?: string;
};

/**
 * The self-dismissing corner toast — three independent copies found
 * (Dashboard's save confirmation, Snowman's day-closed note, the training
 * tests' achievement toast), all `fixed bottom-8 right-8`, all clearing
 * themselves with `setTimeout`. This component owns that timer; mount it
 * when there's something to say, and it calls `onDismiss` on its own.
 */
export function Toast({ children, duration = 2500, onDismiss, tone = 'default', className = '' }: Props) {
    useEffect(() => {
        if (!duration || !onDismiss) return;
        const t = setTimeout(onDismiss, duration);
        return () => clearTimeout(t);
    }, [duration, onDismiss]);

    return (
        <div
            className={`fixed bottom-8 right-8 gq-glass px-6 py-3 gq-fade z-[110] ${className}`}
            style={tone === 'good' ? { borderColor: 'var(--gq-good)' } : undefined}
        >
            {children}
        </div>
    );
}
