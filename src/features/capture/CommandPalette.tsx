import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Icon } from '../../components/Icons';
import { ALL_ACTIONS, SECTION_OF, type PaletteAction } from './actions';
import { Modal } from '../../components/Modal';

/**
 * Quick capture: ⌘K / Ctrl+K from anywhere.
 *
 * Not a search box. If capturing a thought costs more than a few seconds the
 * thought is lost, and with it the data every insight in the product depends on
 * — so the palette creates records as well as navigating.
 *
 * Typing `task buy milk` files the task and goes to the board; typing `buy
 * milk` matches nothing and still offers "Новая задача" with that text, because
 * the common case is a person who knows what they want to record and not which
 * command records it.
 */
export function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [active, setActive] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setOpen(o => !o);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        if (!open) return;
        setQuery('');
        setActive(0);
        // After paint, or the input does not exist yet to focus. Closing needs no
        // counterpart: <dialog>.showModal() restores focus to the opener itself.
        requestAnimationFrame(() => inputRef.current?.focus());
    }, [open]);

    const { matches, remainder } = useMemo(() => rank(query), [query]);

    useEffect(() => { setActive(0); }, [query]);

    // Keep the highlighted row in view when arrowing past the fold.
    useEffect(() => {
        listRef.current?.querySelector<HTMLElement>('[data-active="true"]')
            ?.scrollIntoView({ block: 'nearest' });
    }, [active]);

    if (!open) return null;

    const close = () => setOpen(false);

    const runAction = (action: PaletteAction) => {
        close();
        action.run(remainder, navigate);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(i + 1, matches.length - 1)); return; }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(i - 1, 0)); return; }
        if (e.key === 'Enter') {
            e.preventDefault();
            const chosen = matches[active];
            if (chosen) runAction(chosen);
        }
    };

    return (
        <Modal title="Быстрый ввод" onClose={close} bare size="md" align="top">
            {/* The key handler belongs on the wrapper, not the input: ArrowUp and
                ArrowDown move the listbox selection, which is a property of the
                combobox as a whole. Focus never leaves the input, so this cannot
                intercept a key the user aimed elsewhere. */}
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div onKeyDown={onKeyDown}>
                <div className="flex items-center gap-3 px-4 border-b border-[var(--border)]">
                    <Icon name="search" size={16} className="text-[var(--gq-text-tertiary)] shrink-0" aria-hidden="true" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Что записать или куда перейти?"
                        aria-label="Команда или текст записи"
                        role="combobox"
                        aria-expanded={matches.length > 0}
                        aria-controls="palette-results"
                        aria-autocomplete="list"
                        aria-activedescendant={matches[active] ? `palette-${matches[active].id}` : undefined}
                        className="flex-1 bg-transparent py-3.5 t-small outline-none placeholder:text-[var(--gq-text-subtle)]"
                    />
                    <kbd className="t-label text-[10px] border border-[var(--border)] rounded px-1.5 py-0.5 shrink-0">
                        Esc
                    </kbd>
                </div>

                <ul
                    id="palette-results"
                    ref={listRef}
                    role="listbox"
                    aria-label="Результаты"
                    className="max-h-[50vh] overflow-y-auto py-1.5"
                >
                    {matches.length === 0 && (
                        <li className="px-4 py-6 t-small text-[var(--gq-text-tertiary)] text-center">
                            Ничего не найдено
                        </li>
                    )}
                    {matches.map((action, i) => (
                        /* The option itself is the target. A <button> inside an
                           option is invalid — an option may not contain another
                           interactive element — and a focusable child would fight
                           `aria-activedescendant` for the focus ring. The input
                           keeps DOM focus throughout; the option is announced
                           through activedescendant and clicked with the mouse. */
                        /* `<li role="option">` inside `<ul role="listbox">` is the
                           ARIA Authoring Practices listbox pattern verbatim. The
                           click handler is the pointer path; the keyboard path is
                           the input's arrow keys driving `aria-activedescendant`,
                           which is why the option itself carries no key handler. */
                        /* eslint-disable-next-line jsx-a11y/click-events-have-key-events */
                        <li
                            key={action.id}
                            id={`palette-${action.id}`}
                            role="option"
                            aria-selected={i === active}
                            data-active={i === active}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => runAction(action)}
                            className={`cursor-pointer px-4 py-2.5 flex items-center gap-3 transition ${
                                i === active ? 'bg-cyan-400/10' : 'hover:bg-white/5'
                            }`}
                        >
                            <Icon
                                name={action.icon}
                                size={15}
                                className={i === active ? 'text-cyan-400 shrink-0' : 'text-[var(--gq-text-tertiary)] shrink-0'}
                            />
                            <span className="flex-1 min-w-0">
                                <span className="block t-small truncate">
                                    {action.label}
                                    {action.group === 'Создать' && remainder && (
                                        <span className="text-cyan-400"> · {remainder}</span>
                                    )}
                                </span>
                                {(action.hint || SECTION_OF[action.id]) && (
                                    <span className="block text-[11px] text-[var(--gq-text-tertiary)] truncate">
                                        {SECTION_OF[action.id] ?? action.hint}
                                    </span>
                                )}
                            </span>
                            <span className="t-label shrink-0">{action.group}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </Modal>
    );
}

/** Alias words so the palette answers to what people actually type. */
const ALIASES: Record<string, string[]> = {
    task: ['task', 'задача', 'дело', 'todo'],
    habit: ['habit', 'привычка'],
    journal: ['journal', 'дневник', 'запись', 'note', 'мысль'],
    expense: ['expense', 'расход', 'трата', 'потратил'],
    checkin: ['checkin', 'день', 'закрыть'],
    workout: ['workout', 'тренировка', 'зал'],
};

/**
 * Splits the query into a matched command and the text that follows it, and
 * ranks the actions.
 *
 * Capture actions stay visible on a no-match query so free text always has
 * somewhere to go — typing a thought and pressing Enter should file it, not
 * report failure.
 */
function rank(query: string): { matches: PaletteAction[]; remainder: string } {
    const q = query.trim();
    if (!q) return { matches: ALL_ACTIONS, remainder: '' };

    const lower = q.toLowerCase();
    const firstWord = lower.split(/\s+/)[0] ?? '';

    // A leading command word claims the rest of the line as its payload.
    for (const [id, words] of Object.entries(ALIASES)) {
        if (words.includes(firstWord)) {
            const action = ALL_ACTIONS.find(a => a.id === id);
            if (action) {
                const rest = ALL_ACTIONS.filter(a => a.id !== id && matchesText(a, lower));
                return { matches: [action, ...rest], remainder: q.slice(firstWord.length).trim() };
            }
        }
    }

    const matched = ALL_ACTIONS.filter(a => matchesText(a, lower));
    const captures = ALL_ACTIONS.filter(a => a.group === 'Создать' && !matched.includes(a));

    // Whatever was typed is the payload for a capture action.
    return { matches: [...matched, ...captures], remainder: q };
}

function matchesText(action: PaletteAction, lower: string): boolean {
    const haystack = `${action.label} ${action.hint ?? ''} ${SECTION_OF[action.id] ?? ''}`.toLowerCase();
    return haystack.includes(lower);
}
