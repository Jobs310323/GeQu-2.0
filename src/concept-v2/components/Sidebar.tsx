import { useState } from 'react';
import { NAV_GROUPS, BOTTOM_ITEMS } from '../lib/nav';
import { Icon } from './Icons';
import { MOCK } from '../lib/mockData';

type Props = {
    page: string;
    setPage: (id: string) => void;
    theme: 'dark' | 'light';
    setTheme: (t: 'dark' | 'light') => void;
};

export function Sidebar({ page, setPage, theme, setTheme }: Props) {
    const [collapsed, setCollapsed] = useState(false);
    const energyPct = `${(MOCK.energy / 10) * 100}%`;

    return (
        <aside className={`${collapsed ? 'w-[64px]' : 'w-60'} shrink-0 h-full flex flex-col bg-[#0d0e12] border-r border-white/5 transition-[width] duration-200`}>
            <div className="flex items-center justify-between px-3 h-14 border-b border-white/5 shrink-0">
                {!collapsed && <span className="font-semibold text-white tracking-tight">GeQu</span>}
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                    title={collapsed ? 'Развернуть' : 'Свернуть'}
                >
                    <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
                </button>
            </div>

            <div className="p-3 shrink-0">
                <button
                    onClick={() => setPage('dashboard')}
                    className={`w-full flex items-center gap-2 rounded-xl border border-white/10 text-sm text-white hover:bg-white/5 transition py-2 ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                >
                    <Icon name="plus" size={16} />
                    {!collapsed && <span>Новая запись</span>}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 flex flex-col gap-4 pb-3">
                {NAV_GROUPS.map(group => (
                    <div key={group.id}>
                        {!collapsed && (
                            <div className="px-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                {group.title}
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map(item => {
                                const active = page === item.id;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setPage(item.id)}
                                        title={collapsed ? item.label : undefined}
                                        className={`flex items-center gap-2.5 rounded-lg text-sm py-1.5 transition ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${
                                            active
                                                ? 'bg-cyan-400/10 text-cyan-300'
                                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                    >
                                        <Icon name={item.icon} size={16} />
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            <div className="px-3 pb-3 flex flex-col gap-2 shrink-0">
                {BOTTOM_ITEMS.map(item => {
                    const active = page === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setPage(item.id)}
                            title={collapsed ? item.label : undefined}
                            className={`flex items-center gap-2.5 rounded-lg text-sm py-1.5 transition ${collapsed ? 'justify-center px-0' : 'px-2.5'} ${
                                active ? 'bg-cyan-400/10 text-cyan-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon name={item.icon} size={16} />
                            {!collapsed && <span>{item.label}</span>}
                        </button>
                    );
                })}

                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                    className={`flex items-center gap-2.5 rounded-lg text-sm py-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition ${collapsed ? 'justify-center px-0' : 'px-2.5'}`}
                >
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} />
                    {!collapsed && <span>{theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}</span>}
                </button>

                <div className={`rounded-xl bg-[#14161c] border border-white/5 ${collapsed ? 'p-2' : 'p-3'}`}>
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-1">
                            <div className="w-7 h-7 rounded-full bg-cyan-400/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center">
                                {MOCK.user.level}
                            </div>
                            <div className="w-full h-1 rounded-full bg-black/30 overflow-hidden">
                                <div className="h-full bg-cyan-400" style={{ width: energyPct }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-cyan-400/20 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                                    {MOCK.user.level}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm text-white truncate">{MOCK.user.name}</div>
                                    <div className="text-[11px] text-slate-500">Уровень {MOCK.user.level}</div>
                                </div>
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                                <span>Энергия</span>
                                <span className="text-slate-300 font-medium">{MOCK.energy.toFixed(1)}/10</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: energyPct }} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
