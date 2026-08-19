import type { ReactNode } from 'react';
import { Icon } from './Icons';

/**
 * Header + tab strip shared by the two screens of the GeQu-Checkin-MyCard
 * design. In the prototype both live on one page behind a local `tab` state;
 * here they stay two nav destinations, so the strip drives `setPage` instead
 * and the design still reads as a single surface.
 */

const TABS = [
    { id: 'dashboard', label: 'Ежедневный чекин', icon: 'sun' },
    { id: 'card', label: 'Моя карточка', icon: 'idcard' },
];

export function GqTabs({ page, setPage }: { page: string; setPage?: (p: string) => void }) {
    return (
        <div className="flex gap-[22px] mb-6" style={{ borderBottom: '1px solid var(--gq-divider)' }}>
            {TABS.map(t => (
                <button key={t.id} onClick={() => setPage?.(t.id)} disabled={!setPage}
                    className={`gq-tab ${page === t.id ? 'active' : ''}`}>
                    <Icon name={t.icon} size={15} />
                    {t.label}
                </button>
            ))}
        </div>
    );
}

/** Eyebrow + gradient title, with room for one page-level action on the right. */
export function GqPageHead({ eyebrow = 'Рефлексия', title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
    return (
        <div className="flex justify-between items-start gap-3 flex-wrap mb-[22px]">
            <div>
                <div className="text-xs uppercase opacity-60" style={{ color: 'var(--gq-text-2)', letterSpacing: '0.08em' }}>
                    {eyebrow}
                </div>
                <h1 className="gq-heading gq-display text-[26px] font-bold mt-0.5">{title}</h1>
            </div>
            {action}
        </div>
    );
}
