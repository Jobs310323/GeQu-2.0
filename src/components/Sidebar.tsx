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

    const energyTone = energy >= 7 ? 'var(--gq-good)' : energy >= 4 ? 'var(--gq-warn)' : 'var(--gq-bad)';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;
    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);

    return (
        <aside className={`${collapsed ? 'w-[68px]' : 'w-60'} shrink-0 h-full flex flex-col overflow-hidden transition-[width] duration-200 backdrop-blur-xl`}
            style={{ background: 'var(--gq-glass-bg)', borderRight: '1px solid var(--gq-glass-border)' }}>
            <div style={{ borderBottom: '1px solid var(--gq-divider)' }}
                className={`flex items-center px-3 h-14 shrink-0 ${collapsed ? 'flex-col justify-center gap-2 h-auto py-3' : 'justify-between'}`}>
                {collapsed ? <LogoMark size={24} /> : <Logo />}
                <div className="flex items-center gap-1.5">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
                    <button
                        onClick={() => setCollapsed((c: boolean) => !c)}
                        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
                        className="gq-nav p-1.5 rounded-lg"
                    >
                        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
                    </button>
                </div>
            </div>

            <div className="p-3 shrink-0">
                <button
                    onClick={() => setPage('dashboard')}
                    title={collapsed ? 'Новая запись' : undefined}
                    className={`gq-nav w-full flex items-center gap-2 rounded-xl text-sm py-2 ${
                        page === 'dashboard' ? 'active' : ''
                    } ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                    style={page === 'dashboard' ? undefined : { borderColor: 'var(--gq-glass-border)' }}
                >
                    <Icon name="plus" size={16} />
                    {!collapsed && <span>Новая запись</span>}
                </button>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 flex flex-col gap-4 pb-3">
                {groups.map(group => (
                    <div key={group.id}>
                        {!collapsed && (
                            <div className="px-2 mb-1 text-[10px] uppercase tracking-[0.08em] gq-muted select-none">
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
                                        className={`gq-nav w-full text-left px-2 py-1.5 rounded-lg cursor-pointer flex items-center gap-2.5 text-sm ${
                                            active ? 'active' : ''
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    >
                                        <Icon name={NAV_ICON[item.id] ?? 'grid'} size={16} />
                                        {!collapsed && <span className="truncate flex-1">{item.label}</span>}
                                        {!collapsed && badge > 0 && (
                                            <span className="gq-badge text-[10px] px-1.5 py-0.5 rounded-full font-bold">
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
            <div className="mt-1 mx-3 mb-3 rounded-2xl group relative shrink-0 overflow-hidden"
                style={{
                    background: 'var(--gq-glass-bg)',
                    border: `1px solid ${page === 'card'
                        ? 'color-mix(in srgb, var(--gq-grad-a) 45%, transparent)'
                        : 'var(--gq-glass-border)'}`,
                }}>
                <button
                    onClick={() => setPage('card')}
                    title={collapsed ? `Моя карточка · Уровень ${level} · Энергия ${energy.toFixed(1)}/10` : 'Открыть мою карточку'}
                    className={`gq-nav w-full text-left rounded-none ${collapsed ? 'p-2' : 'p-2.5'}`}
                    style={{ border: 'none', color: 'inherit' }}
                >
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="gq-badge gq-display w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center">
                                {level}
                            </div>
                            <div className="gq-track w-full h-1.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: energyWidth, background: energyTone }} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 mb-2">
                                <div className="gq-badge gq-display w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0">
                                    {level}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] gq-muted">Уровень {level}</div>
                                    <div className="gq-track w-full h-1 rounded-full overflow-hidden mt-1">
                                        <div className="h-full rounded-full"
                                            style={{ width: `${levelPct}%`, background: 'linear-gradient(90deg, var(--gq-grad-a), var(--gq-grad-b))' }} />
                                    </div>
                                </div>
                                <Icon name="chevronRight" size={13} className="gq-muted shrink-0" />
                            </div>
                            <div className="flex justify-between items-center mb-1.5">
                                <span className="text-[11px] gq-muted">Энергия</span>
                                <span className="gq-display text-[11px] font-bold tabular-nums" style={{ color: 'var(--gq-text)' }}>
                                    {energy.toFixed(1)}/10
                                </span>
                            </div>
                            <div className="gq-track w-full h-1.5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: energyWidth, background: energyTone }} />
                            </div>
                            <div className="text-[10px] gq-muted mt-1">{energyText}</div>
                        </>
                    )}
                </button>

                <div className={`flex items-center ${collapsed ? 'flex-col' : ''}`}
                    style={{ borderTop: '1px solid var(--gq-divider)' }}>
                    <button
                        onClick={onRoulette}
                        title="Дофаминовая рулетка"
                        className={`gq-nav flex items-center justify-center py-2 ${collapsed ? 'w-full' : 'px-3'}`}
                        style={collapsed
                            ? { border: 'none', borderBottom: '1px solid var(--gq-divider)' }
                            : { border: 'none', borderRight: '1px solid var(--gq-divider)' }}
                    >
                        <Icon name="dice" size={15} />
                    </button>
                    <button
                        onClick={() => setPage('settings')}
                        title="Настройки"
                        className={`gq-nav flex-1 flex items-center justify-center gap-2 py-2 text-xs ${page === 'settings' ? 'active' : ''}`}
                        style={{ border: 'none', background: 'transparent' }}
                    >
                        <Icon name="settings" size={15} />
                        {!collapsed && <span>Настройки</span>}
                    </button>
                    <button
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                        className={`gq-nav flex items-center justify-center py-2 ${collapsed ? 'w-full' : 'px-3'}`}
                        style={collapsed
                            ? { border: 'none', borderTop: '1px solid var(--gq-divider)' }
                            : { border: 'none', borderLeft: '1px solid var(--gq-divider)' }}
                    >
                        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                    </button>
                </div>

                {todayLog && !collapsed && (
                    <div className="gq-glass absolute left-full ml-2 bottom-0 w-48 p-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        <p className="text-xs gq-muted mb-2">Разбор энергии:</p>
                        <p className="text-xs" style={{ color: 'var(--gq-text)' }}>Сон: <span className="gq-display tabular-nums" style={{ color: 'var(--gq-grad-b)' }}>{(todayLog.sleep * 0.4).toFixed(1)}</span></p>
                        <p className="text-xs" style={{ color: 'var(--gq-text)' }}>Настроение: <span className="gq-display tabular-nums" style={{ color: 'var(--gq-grad-b)' }}>{(todayLog.mood * 0.3).toFixed(1)}</span></p>
                        <p className="text-xs" style={{ color: 'var(--gq-text)' }}>Фокус: <span className="gq-display tabular-nums" style={{ color: 'var(--gq-grad-b)' }}>{(todayLog.focus * 0.3).toFixed(1)}</span></p>
                    </div>
                )}
            </div>
        </aside>
    );
}
