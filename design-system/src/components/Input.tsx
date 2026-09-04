import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../reexports';

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
    /** Renders a leading search icon and left-pads the field (Diary/Knowledge search boxes). */
    searchIcon?: boolean;
    className?: string;
};

/** The redesign's field style (`.gq-input`) — used for every text/date/password field on Dashboard, BrainIq, NodeInspector. */
export function Input({ searchIcon, className = '', ...rest }: InputProps) {
    if (searchIcon) {
        return (
            <div className="relative">
                <Icon name="search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 gq-muted pointer-events-none" />
                <input className={`gq-input pl-9 ${className}`} {...rest} />
            </div>
        );
    }
    return <input className={`gq-input ${className}`} {...rest} />;
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & { className?: string };

export function Textarea({ className = '', ...rest }: TextareaProps) {
    return <textarea className={`gq-input ${className}`} {...rest} />;
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & { className?: string; children: ReactNode };

/** Every dropdown in the app is a plain `<select>` styled like a text field — there is no custom popover select. */
export function Select({ className = '', children, ...rest }: SelectProps) {
    return (
        <select className={`gq-input ${className}`} {...rest}>
            {children}
        </select>
    );
}
