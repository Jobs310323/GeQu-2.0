import { useState, useEffect } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { NAV_GROUPS } from '../lib/nav';
import { Logo, LogoMark } from './Logo';
import { Icon, NAV_ICON } from './Icons';

const COLLAPSE_KEY = 'gequ_sidebar_collapsed';

export function Sidebar({ page, setPage, theme, setTheme, energy, todayLog,
                          prefs, reminderCount, levelInfo, onRoulette }: any) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [collapsed]);

    const hidden: string[] = prefs?.hiddenTabs ?? [];

    // Drop hidden entries, then drop groups that end up empty.
    const groups = NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => !hidden.includes(i.id)) }))
        .filter(g => g.items.length > 0);

    const energyColor = energy >= 7 ? 'bg-green-400' : energy >= 4 ? 'bg-yellow-400' : 'bg-red-400';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;
    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);

    return (
        <aside className={`${collapsed ? 'w-[68px]' : 'w-60'} shrink-0 h-full flex flex-col bg-[var(--bg-card)] border-r border-[var(--border)] backdrop-blur-md overflow-hidden transition-[width] duration-200`}>
            <div className={`flex items-center px-3 h-14 shrink-0 border-b border-[var(--border)] ${collapsed ? 'flex-col justify-center gap-2 h-auto py-3' : 'justify-between'}`}>
                {collapsed ? <LogoMark size={24} /> : <Logo />}
                <div className="flex items-center gap-1.5">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
                    <button
                        onClick={() => setCollapsed((c: boolean) => !c)}
                        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)] hover:bg-white/5 transition"
                    >
                        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
                    </button>
                </div>
            </div>

            <div className="p-3 shrink-0">
                <button
                    onClick={() => setPage('dashboard')}
                    title={collapsed ? 'Новая запись' : undefined}
                    className={`w-full flex items-center gap-2 rounded-xl border text-sm transition py-2 ${
                        page === 'dashboard'
                            ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/25'
                            : 'border-[var(--border)] hover:bg-white/5'
                    } ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                >
                    <Icon name="plus" size={16} />
                    {!collapsed && <span>Новая запись</span>}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 flex flex-col gap-4 pb-3">
                {groups.map(group => (
                    <div key={group.id}>
                        {!collapsed && (
                            <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] select-none">
                                {group.title}
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                            {group.items.map(item => {
                                const active = page === item.id;
                                const badge = item.id === 'calendar' ? reminderCount : 0;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => setPage(item.id)}
                                        title={collapsed ? item.label : undefined}
                                        className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-2.5 text-sm border ${
                                            active
                                                ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                                                : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)] border-transparent'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    >
                                        <Icon name={NAV_ICON[item.id] ?? 'grid'} size={16} />
                                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                                        {!collapsed && badge > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                                                {badge}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Profile block: level + energy, doubles as the entry point to
                "Моя карточка", with settings and the theme toggle docked in it. */}
            <div className={`mt-1 mx-3 mb-3 rounded-xl bg-[var(--bg-input)] border group relative shrink-0 ${
                page === 'card' ? 'border-cyan-400/30' : 'border-[var(--border)]'
            }`}>
                <button
                    onClick={() => setPage('card')}
                    title={collapsed ? `Моя карточка · Уровень ${level} · Энергия ${energy.toFixed(1)}/10` : 'Открыть мою карточку'}
                    className={`w-full text-left rounded-t-xl hover:bg-white/5 transition ${collapsed ? 'p-2' : 'p-2.5'}`}
                >
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-cyan-400/15 text-cyan-400 text-[11px] font-bold flex items-center justify-center">
                                {level}
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                                <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                                    {level}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] text-[var(--text-muted)]">Уровень {level}</div>
                                    <div className="w-full h-1 rounded-full bg-black/30 overflow-hidden mt-1">
                                        <div className="h-full bg-cyan-400" style={{ width: `${levelPct}%` }} />
                                    </div>
                                </div>
                                <Icon name="chevronRight" size={13} className="text-[var(--text-muted)] shrink-0" />
                            </div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] text-[var(--text-muted)]">Энергия</span>
                                <span className="text-[11px] font-bold text-[var(--text-main)]">{energy.toFixed(1)}/10</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                                <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }} />
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-1">{energyText}</div>
                        </>
                    )}
                </button>

                <div className={`flex items-center border-t border-[var(--border)] ${collapsed ? 'flex-col' : ''}`}>
                    <button
                        onClick={onRoulette}
                        title="Дофаминовая рулетка"
                        className={`flex items-center justify-center py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition hover:bg-white/5 ${
                            collapsed ? 'w-full border-b border-[var(--border)]' : 'px-3 border-r border-[var(--border)]'
                        }`}
                    >
                        <Icon name="dice" size={15} />
                    </button>
                    <button
                        onClick={() => setPage('settings')}
                        title="Настройки"
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs transition hover:bg-white/5 ${
                            page === 'settings' ? 'text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                    >
                        <Icon name="settings" size={15} />
                        {!collapsed && <span>Настройки</span>}
                    </button>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                        className={`flex items-center justify-center py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition hover:bg-white/5 ${
                            collapsed ? 'w-full border-t border-[var(--border)]' : 'px-3 border-l border-[var(--border)]'
                        }`}
                    >
                        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                    </button>
                </div>

                {todayLog && !collapsed && (
                    <div className="absolute left-full ml-2 bottom-0 w-48 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="text-xs text-[var(--text-muted)] mb-2">Разбор энергии:</p>
                        <p className="text-xs text-[var(--text-main)]">Сон: <span className="text-purple-400">{(todayLog.sleep * 0.4).toFixed(1)}</span></p>
                        <p className="text-xs text-[var(--text-main)]">Настроение: <span className="text-purple-400">{(todayLog.mood * 0.3).toFixed(1)}</span></p>
                        <p className="text-xs text-[var(--text-main)]">Фокус: <span className="text-purple-400">{(todayLog.focus * 0.3).toFixed(1)}</span></p>
                    </div>
                )}
            </div>
        </aside>
    );
}
