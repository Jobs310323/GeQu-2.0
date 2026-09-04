import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../reexports';

type Variant = 'primary' | 'ghost' | 'danger' | 'icon';

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
    /**
     * `primary` — the app's gradient action button (`.gq-btn`), used in ~75
     * places for the one confirming/committing action on a screen.
     * `ghost` — a secondary action, same pill material as a filter chip
     * (`.gq-chip`).
     * `danger` — a destructive text action (delete/clear), tinted red.
     * `icon` — a square icon-only button (`.gq-icon-btn`), for a row of
     * trailing actions (edit/tag/trash …).
     */
    variant?: Variant;
    /** Icon name from the Icon set (see Icon component), shown before the label. */
    icon?: string;
    children?: ReactNode;
    className?: string;
};

/**
 * The app's one button, in its four real shapes. `primary` and `icon` are
 * literal `.gq-btn`/`.gq-icon-btn` (the redesign's own CSS); `ghost` reuses
 * `.gq-chip`; `danger` is the plain destructive-text idiom repeated across
 * ~15 delete/clear actions (Habits, Goals, ClinicalTests, Cbt, Diary …).
 */
export function Button({ variant = 'primary', icon, children, className = '', disabled, ...rest }: Props) {
    if (variant === 'icon') {
        return (
            <button className={`gq-icon-btn ${className}`} disabled={disabled} {...rest}>
                {icon && <Icon name={icon} size={16} />}
                {children}
            </button>
        );
    }
    if (variant === 'ghost') {
        return (
            <button className={`gq-chip ${className}`} disabled={disabled} {...rest}>
                {icon && <Icon name={icon} size={13} />}
                {children}
            </button>
        );
    }
    if (variant === 'danger') {
        return (
            <button
                className={`inline-flex items-center gap-1.5 text-sm hover:underline disabled:opacity-45 ${className}`}
                style={{ color: 'var(--gq-bad)' }}
                disabled={disabled}
                {...rest}
            >
                {icon && <Icon name={icon} size={14} />}
                {children}
            </button>
        );
    }
    return (
        <button className={`gq-btn ${className}`} disabled={disabled} {...rest}>
            {icon && <Icon name={icon} size={15} />}
            {children}
        </button>
    );
}
