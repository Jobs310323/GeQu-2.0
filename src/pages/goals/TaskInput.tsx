import { useState } from 'react';
import { Icon } from '../../components/Icons';

type Props = {
    addTask: (text: string) => void;
    placeholder?: string;
    autoFocus?: boolean;
    onCancel?: () => void;
};

export function TaskInput({ addTask, placeholder = 'Добавить шаг...', autoFocus, onCancel }: Props) {
    const [text, setText] = useState('');
    const submit = () => { if (text.trim()) { addTask(text.trim()); setText(''); } };
    return (
        <div className="flex gap-2">
            <input
                type="text"
                autoFocus={autoFocus}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') submit();
                    if (e.key === 'Escape') onCancel?.();
                }}
                onBlur={() => { if (!text.trim()) onCancel?.(); }}
                placeholder={placeholder}
                className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 text-sm outline-none focus:border-purple-400"
            />
            <button onClick={submit} className="flex items-center justify-center bg-purple-400/20 text-purple-400 border border-purple-400 px-3 py-2 rounded-xl">
                <Icon name="plus" size={14} />
            </button>
        </div>
    );
}
