import type { ReactNode } from 'react';

type Props = {
    children: ReactNode;
    /** Drifting background blobs (Dashboard, UserCard, AuthGate). Off for pages that don't want the motion. */
    blobs?: boolean;
    className?: string;
};

/**
 * The redesign's full-page background — `.gq-page`/`.gq-page-inner`, the
 * radial gradient the page bottoms out into, content column capped at
 * 1100px. Cancels `<main>`'s own 24px padding (see the note on `.gq-page`
 * in gq-components.css) — use this as the outermost element of a page.
 */
export function PageShell({ children, blobs = true, className = '' }: Props) {
    return (
        <div className={`gq-page ${className}`}>
            {blobs && <div className="gq-blob1" />}
            {blobs && <div className="gq-blob2" />}
            <div className="gq-page-inner">{children}</div>
        </div>
    );
}
