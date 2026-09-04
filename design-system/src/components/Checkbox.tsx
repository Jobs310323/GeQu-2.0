import { Icon } from '../reexports';

type Props = {
    checked: boolean;
    onChange: (checked: boolean) => void;
    /** `default` — native checkbox, accent-color themed globally.
     * `circle` — the big circular habit-tick (Habits.tsx), 40px, filled+scaled when checked. */
    variant?: 'default' | 'circle';
    disabled?: boolean;
    className?: string;
};

export function Checkbox({ checked, onChange, variant = 'default', disabled, className = '' }: Props) {
    if (variant === 'circle') {
        return (
            <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 transition ${className}`}
                style={{
                    borderColor: checked ? 'var(--gq-grad-a)' : 'var(--gq-divider)',
                    background: checked ? 'linear-gradient(145deg, var(--gq-grad-a), var(--gq-grad-b))' : 'transparent',
                }}
            >
                {checked && <Icon name="check" size={18} className="text-white" />}
            </button>
        );
    }
    return (
        <input
            type="checkbox"
            checked={checked}
            disabled={disabled}
            onChange={e => onChange(e.target.checked)}
            className={className}
        />
    );
}
