import { useEffect, useRef, useId } from 'react';
import type { ReactNode } from 'react';
import { Icon } from './Icons';

type Props = {
    /** Visible title. Rendered as the dialog's heading and its accessible name. */
    title: string;
    /** Optional line under the title. */
    subtitle?: string;
    onClose: () => void;
    children: ReactNode;
    /** Width cap on the panel. Defaults to a comfortable reading measure. */
    size?: 'sm' | 'md' | 'lg' | 'full';
    /** Bottom sheet on small screens — the right shape for a mobile drawer. */
    sheet?: boolean;
    /** Hide the header entirely (surfaces that draw their own chrome). */
    bare?: boolean;
    /** Where the panel sits. `top` suits a palette the user types into — it
     *  keeps the caret near where their eyes already are. */
    align?: 'center' | 'top';
};

const WIDTH = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    full: 'max-w-4xl',
} as const;

/**
 * The app's one modal, built on the native `<dialog>` element.
 *
 * Every overlay in the app used to be a hand-rolled
 * `<div class="fixed inset-0 z-50" onClick={close}>` with a
 * `stopPropagation` child. That pattern gets six things wrong at once, and got
 * all six wrong in all six places:
 *
 *   - no focus trap — Tab walked out of the dialog into the page behind it
 *   - no Escape — the only way out was finding the ✕ with a mouse
 *   - focus was not restored on close, so keyboard users landed at <body>
 *   - background content stayed reachable by screen readers
 *   - no `role="dialog"`, so nothing announced it as one
 *   - z-index stacking was a guess (`z-50` eight times, plus a `z-[110]`)
 *
 * `showModal()` fixes all six in the platform: focus is trapped, Escape closes,
 * focus returns to the trigger, the rest of the page becomes inert, the role is
 * implicit, and the dialog renders in the top layer where z-index does not
 * apply. Hand-rolling any of that would be strictly worse code doing a strictly
 * worse job.
 *
 * The UA stylesheet gives `<dialog>` a border, padding, a centred margin and a
 * `max-width` of the viewport; all of it is reset here so the panel can be laid
 * out with utilities like any other element.
 */
export function Modal({ title, subtitle, onClose, children, size = 'md', sheet = false, bare = false, align = 'center' }: Props) {
    const ref = useRef<HTMLDialogElement>(null);
    const opener = useRef<HTMLElement | null>(null);
    const titleId = useId();

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        /* Capture the opener BEFORE showModal(), which immediately moves focus
           into the dialog — read it afterwards and you record the dialog's own
           first control, then "restore" focus to an element that is about to be
           unmounted. */
        opener.current = document.activeElement as HTMLElement | null;

        // `showModal` rather than `show`: only the modal form traps focus, makes
        // the background inert and renders into the top layer.
        if (!el.open) el.showModal();

        // The background is inert but still scrollable behind the dialog.
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
            if (el.open) el.close();
            /* `showModal()` does restore focus to the opener on close — but only
               if the dialog is still in the document when the UA gets there.
               Every call site renders conditionally (`{open && <Modal …/>}`), so
               closing sets state, React unmounts synchronously (close and cancel
               are discrete events) and the UA has nothing left to restore from:
               focus lands on <body>. `npm run check:a11y` caught exactly that,
               so put focus back explicitly — guarding against the opener having
               been unmounted by the same action. */
            if (opener.current?.isConnected) opener.current.focus();
        };
    }, []);

    /* One exit path for every way out. The native `close` event fires for
       Escape, for `close()`, and for a form with `method="dialog"`, so routing
       the caller's `onClose` through it means no dismissal can be missed. */
    const handleClose = () => onClose();

    /* A click landing on the <dialog> itself rather than on the panel is a
       backdrop click — the panel fills the dialog's content box, so anything
       outside it is backdrop. `mousedown` guards against a drag that starts
       inside the panel and releases outside registering as a dismissal. */
    const downOnBackdrop = useRef(false);

    /* The two pointer handlers below implement backdrop dismissal. It is a
       pointer affordance layered on top of the keyboard path, not a substitute
       for one — <dialog> closes on Escape natively. The a11y rules read
       <dialog> as a static, non-interactive element; it is neither. */
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
    /* eslint-disable jsx-a11y/click-events-have-key-events */
    return (
        <dialog
            ref={ref}
            onClose={handleClose}
            onCancel={handleClose}
            aria-labelledby={titleId}
            onMouseDown={e => { downOnBackdrop.current = e.target === ref.current; }}
            onClick={e => { if (downOnBackdrop.current && e.target === ref.current) onClose(); }}
            className={`gq-modal ${
                sheet ? 'items-end sm:items-center' : align === 'top' ? 'items-start pt-[12vh]' : 'items-center'
            }`}
        >
            <div
                className={`glass-card w-full ${WIDTH[size]} ${
                    sheet ? 'rounded-t-2xl sm:rounded-2xl' : 'rounded-2xl'
                } max-h-[90dvh] ${bare ? 'overflow-hidden' : 'overflow-y-auto'}`}
            >
                {bare ? (
                    /* Still needs an accessible name even when no header shows. */
                    <h2 id={titleId} className="sr-only">{title}</h2>
                ) : (
                    <div className="flex items-start justify-between gap-3 p-5 pb-3">
                        <div className="min-w-0">
                            <h2 id={titleId} className="t-h3">{title}</h2>
                            {subtitle && <p className="t-small text-[var(--gq-text-tertiary)] mt-1">{subtitle}</p>}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Закрыть"
                            className="shrink-0 -m-1.5 p-1.5 rounded-lg text-[var(--gq-text-tertiary)] hover:text-[var(--gq-text-primary)] hover:bg-white/5 transition"
                        >
                            <Icon name="close" size={18} />
                        </button>
                    </div>
                )}
                <div className={bare ? '' : 'px-5 pb-5'}>{children}</div>
            </div>
        </dialog>
    );
    /* eslint-enable jsx-a11y/click-events-have-key-events */
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions */
}
