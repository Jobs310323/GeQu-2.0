import type { InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'type'> & { className?: string };

/**
 * The fully custom range input (`.gq-slider`) — gradient thumb, no native
 * track — used for Dashboard's sleep/focus/mood 0-10 sliders. The richest
 * custom form control in the app; everywhere else falls back to the plain
 * native range (`accent-color` themed globally).
 */
export function Slider({ className = '', ...rest }: Props) {
    return <input type="range" className={`gq-slider ${className}`} {...rest} />;
}
