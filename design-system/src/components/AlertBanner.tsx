import type { ReactNode } from 'react';

type Tone = 'error' | 'warn' | 'good' | 'info';

const TONE_VAR: Record<Tone, string> = {
    error: 'var(--gq-bad)',
    warn: 'var(--gq-warn)',
    good: 'var(--gq-good)',
    info: 'var(--gq-grad-a)',
};

type Props = {
    tone?: Tone;
    children: ReactNode;
    className?: string;
};

/**
 * The inline banner idiom repeated ~11 times as an error message (UserCard,
 * WeekSummary, Diary, Cbt, AiPlan, Finance) or a status note (Dashboard's
 * "day already closed", Snowman's imbalance warning) — same shape, tinted by
 * tone. `error` is the one already seen everywhere as literal `text-red-400
 * border-red-400/30`; the other three tones use the same recipe off the
 * matching `--gq-*` token.
 */
export function AlertBanner({ tone = 'info', children, className = '' }: Props) {
    const color = TONE_VAR[tone];
    return (
        <div
            className={`p-3 rounded-xl text-sm ${className}`}
            style={{
                color,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
                background: `color-mix(in srgb, ${color} 8%, transparent)`,
            }}
        >
            {children}
        </div>
    );
}
