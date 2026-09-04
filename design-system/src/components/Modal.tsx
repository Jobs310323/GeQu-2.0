import type { ReactNode } from 'react';

type Props = {
    onClose: () => void;
    children: ReactNode;
    /** Tailwind max-width class, e.g. `max-w-sm` (MindMap's report modal), `max-w-md` (DopamineRoulette). */
    maxWidth?: string;
    className?: string;
};

/**
 * The centered-modal shell repeated 5 independent times (MindMap's weekly
 * report, Snowman's ActivityPopup/label modal/edit-day modal) — always
 * `fixed inset-0` backdrop, click-outside-to-close, a `glass-card` panel that
 * stops propagation so clicking inside doesn't close it.
 */
export function Modal({ onClose, children, maxWidth = 'max-w-sm', className = '' }: Props) {
    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className={`glass-card p-6 rounded-2xl w-full ${maxWidth} ${className}`}
                onClick={e => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}
