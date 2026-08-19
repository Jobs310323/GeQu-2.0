import type { ReactNode } from 'react';
import { Icon, NAV_ICON } from './Icons';
import { groupTitleOf } from '../lib/nav';

type Props = {
    page: string;
    title: string;
    subtitle?: string;
    action?: ReactNode;
};

/**
 * The title row on all seventeen pages that are not the checkin or the card.
 * It is the one place they all share, so it is where they pick up the
 * redesign's language: the group the page belongs to as an eyebrow, the title
 * in Manrope under the gradient, and the nav icon in a gradient-tinted badge.
 */
export function PageHeader({ page, title, subtitle, action }: Props) {
    const eyebrow = groupTitleOf(page) ?? 'GeQu';

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4"
            style={{ borderBottom: '1px solid var(--gq-divider)' }}>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                        background: 'color-mix(in srgb, var(--gq-grad-a) 16%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--gq-grad-a) 32%, transparent)',
                        color: 'var(--gq-grad-a)',
                    }}>
                    <Icon name={NAV_ICON[page] ?? 'grid'} size={19} />
                </div>
                <div>
                    <div className="text-[11px] uppercase gq-muted" style={{ letterSpacing: '0.09em' }}>{eyebrow}</div>
                    <h1 className="gq-heading gq-display text-[23px] font-bold leading-tight">{title}</h1>
                    {subtitle && <p className="text-sm mt-0.5" style={{ color: 'var(--gq-text-2)' }}>{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}
