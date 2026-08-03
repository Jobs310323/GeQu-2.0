import type { ReactNode } from 'react';

type Props = {
    title: string;
    children: ReactNode;
    span?: string;
    className?: string;
};

export function BentoCard({ title, children, span = 'col-span-1', className = '' }: Props) {
    return (
        <div className={`${span} rounded-2xl bg-[#14161c] border border-white/5 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] p-4 flex flex-col gap-3 ${className}`}>
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</h3>
            {children}
        </div>
    );
}
