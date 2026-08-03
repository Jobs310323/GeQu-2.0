import type { ReactNode } from 'react';
import { Icon, NAV_ICON } from './Icons';

type Props = {
    page: string;
    title: string;
    subtitle?: string;
    action?: ReactNode;
};

/** Consistent page title row — icon badge + heading, ported from the concept-v2 design pass. */
export function PageHeader({ page, title, subtitle, action }: Props) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center shrink-0">
                    <Icon name={NAV_ICON[page] ?? 'grid'} size={20} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] leading-tight">{title}</h1>
                    {subtitle && <p className="text-sm text-[var(--text-muted)]">{subtitle}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}
