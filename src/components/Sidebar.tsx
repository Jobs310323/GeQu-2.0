import { useState, useEffect, useRef } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { NAV_GROUPS } from '../lib/nav';
import { Logo, LogoMark } from './Logo';
import { Icon, NAV_ICON } from './Icons';

const COLLAPSE_KEY = 'gequ_sidebar_collapsed';
const GROUP_KEY = 'gequ_sidebar_group';

/**
 * Navigation as an accordion, not a wall.
 *
 * Nineteen destinations laid out flat is nineteen decisions every time the user
 * looks left — the exact thing this app exists to spare its users. So exactly
 * one group is open at a time: six short rows plus the handful of items you
 * actually asked for. The group holding the current page opens itself, and the
 * last group you opened is remembered, so the sidebar comes back the way you
 * left it instead of resetting to a list.
 *
 * Collapsed to a rail it keeps the same shape: the six group glyphs, and a
 * click flies the items out beside them.
 */
export function Sidebar({ page, setPage, theme, setTheme, energy, todayLog,
                          prefs, reminderCount, levelInfo, onRoulette }: any) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });
    const [openGroup, setOpenGroup] = useState<string | null>(() => {
        try { return localStorage.getItem(GROUP_KEY) || NAV_GROUPS[0].id; } catch { return NAV_GROUPS[0].id; }
    });
    /** Rail mode only: which group's items are flown out beside the rail. */
    const [flyout, setFlyout] = useState<string | null>(null);
    const railRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [collapsed]);

    useEffect(() => {
        try { if (openGroup) localStorage.setItem(GROUP_KEY, openGroup); } catch { /* ignore */ }
    }, [openGroup]);

    const hidden: string[] = prefs?.hiddenTabs ?? [];

    // Drop hidden entries, then drop groups that end up empty.
    const groups = NAV_GROUPS
        .map(g => ({ ...g, items: g.items.filter(i => !hidden.includes(i.id)) }))
        .filter(g => g.items.length > 0);

    // Landing on a page from anywhere else (a link inside an article, the
    // dashboard's "all N tasks") should leave the sidebar showing where you are.
    const groupOfPage = groups.find(g => g.items.some(i => i.id === page))?.id ?? null;
    useEffect(() => {
        if (groupOfPage) setOpenGroup(groupOfPage);
    }, [groupOfPage]);

    // A flyout is a menu: anything outside it should dismiss it.
    useEffect(() => {
        if (!flyout) return;
        const close = (e: MouseEvent) => {
            if (!railRef.current?.contains(e.target as Node)) setFlyout(null);
        };
        const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlyout(null); };
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [flyout]);

    // Collapsing to the rail turns the accordion into flyouts; leaving a stale
    // one open would have it appear the moment the rail comes back.
    useEffect(() => { setFlyout(null); }, [collapsed]);

    const go = (id: string) => { setPage(id); setFlyout(null); };

    const energyTone = energy >= 7 ? 'var(--gq-good)' : energy >= 4 ? 'var(--gq-warn)' : 'var(--gq-bad)';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;
    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);
    const badgeOf = (id: string) => (id === 'calendar' ? reminderCount : 0);

    const item = (it: { id: string; label: string }) => {
        const badge = badgeOf(it.id);
        return (
            <button
                key={it.id}
                onClick={() => go(it.id)}
                className={`gq-nav gq-item ${page === it.id ? 'active' : ''}`}
            >
                <Icon name={NAV_ICON[it.id] ?? 'grid'} size={14} />
                <span className="truncate flex-1 text-left">{it.label}</span>
                {badge > 0 && <span className="gq-badge gq-pill">{badge}</span>}
            </button>
        );
    };

    return (
        <aside className={`${collapsed ? 'w-[60px]' : 'w-[218px]'} shrink-0 h-full flex flex-col overflow-hidden transition-[width] duration-200 backdrop-blur-xl`}
            style={{ background: 'var(--gq-glass-bg)', borderRight: '1px solid var(--gq-glass-border)' }}>

            <div style={{ borderBottom: '1px solid var(--gq-divider)' }}
                className={`flex items-center px-2.5 h-12 shrink-0 ${collapsed ? 'flex-col justify-center gap-2 h-auto py-2.5' : 'justify-between'}`}>
                {collapsed ? <LogoMark size={22} /> : <Logo />}
                <div className="flex items-center gap-1">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
                    <button
                        onClick={() => setCollapsed((c: boolean) => !c)}
                        title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
                        className="gq-nav p-1 rounded-lg"
                    >
                        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={15} />
                    </button>
                </div>
            </div>

            {/* The one thing the app wants you to do today, kept out of the
                accordion so it never hides behind a closed group. */}
            <div className={collapsed ? 'px-2 pt-2 pb-1' : 'px-2.5 pt-2.5 pb-1.5'}>
                <button
                    onClick={() => go('dashboard')}
                    title={collapsed ? 'Новая запись' : undefined}
                    className={`gq-primary ${page === 'dashboard' ? 'active' : ''} ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                >
                    <Icon name="plus" size={15} />
                    {!collapsed && <span>Новая запись</span>}
                </button>
            </div>

            {/* Rail mode does not scroll: six glyphs always fit, and a scroll
                container would clip the flyouts (`overflow-x: visible` next to
                `overflow-y: auto` computes to auto — it cannot be had). */}
            <nav ref={railRef} className={`flex-1 relative flex flex-col ${collapsed ? 'overflow-visible px-2 gap-1 py-1 items-center' : 'overflow-y-auto px-2.5 gap-0.5 py-1'}`}>
                {groups.map(group => {
                    const open = !collapsed && openGroup === group.id;
                    const holdsPage = group.items.some(i => i.id === page);
                    const pending = group.items.reduce((n, i) => n + badgeOf(i.id), 0);

                    if (collapsed) {
                        return (
                            <div key={group.id} className="relative w-full flex justify-center">
                                <button
                                    onClick={() => setFlyout(f => (f === group.id ? null : group.id))}
                                    title={group.title}
                                    className={`gq-nav gq-glyph ${holdsPage || flyout === group.id ? 'active' : ''}`}
                                >
                                    <Icon name={group.glyph} size={16} />
                                    {pending > 0 && <span className="gq-dot" style={{ background: 'var(--gq-grad-b)' }} />}
                                </button>

                                {flyout === group.id && (
                                    <div className="gq-glass gq-flyout">
                                        <div className="gq-group-title px-1.5 pb-1">{group.title}</div>
                                        {group.items.map(item)}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <div key={group.id}>
                            <button
                                onClick={() => setOpenGroup(g => (g === group.id ? null : group.id))}
                                className={`gq-nav gq-group-head ${holdsPage ? 'holds' : ''}`}
                                aria-expanded={open}
                            >
                                <Icon name={group.glyph} size={15} />
                                <span className="flex-1 text-left truncate">{group.title}</span>
                                {!open && pending > 0 && <span className="gq-badge gq-pill">{pending}</span>}
                                {!open && holdsPage && pending === 0 && <span className="gq-dot" />}
                                <Icon name="chevronDown" size={13} className={`gq-caret ${open ? 'open' : ''}`} />
                            </button>

                            {/* 0fr → 1fr: the panel animates to whatever its content
                                measures, with no max-height guess to grow out of. */}
                            <div className="gq-acc" data-open={open}>
                                <div className="overflow-hidden">
                                    <div className="gq-sub">{group.items.map(item)}</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>

            {/* Profile block: level + energy, doubles as the entry point to
                "Моя карточка", with settings and the theme toggle docked in it. */}
            <div className={`${collapsed ? 'mx-2' : 'mx-2.5'} mt-1 mb-2.5 rounded-2xl group relative shrink-0 overflow-hidden`}
                style={{
                    background: 'var(--gq-glass-bg)',
                    border: `1px solid ${page === 'card'
                        ? 'color-mix(in srgb, var(--gq-grad-a) 45%, transparent)'
                        : 'var(--gq-glass-border)'}`,
                }}>
                <button
                    onClick={() => go('card')}
                    title={collapsed ? `Моя карточка · Уровень ${level} · Энергия ${energy.toFixed(1)}/10` : 'Открыть мою карточку'}
                    className={`gq-nav w-full text-left rounded-none ${collapsed ? 'p-1.5' : 'p-2.5'}`}
                    style={{ border: 'none', color: 'inherit' }}
                >
                    {collapsed ? (
                        <div className="flex flex-col items-center gap-1.5">
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
                        onClick={() => go('settings')}
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
