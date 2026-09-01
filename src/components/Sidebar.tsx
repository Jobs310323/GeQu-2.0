import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { UserButton } from '@clerk/clerk-react';
import { SECTIONS, TODAY_ITEM, sectionForPath, type NavItem } from '../lib/nav';
import { Logo, LogoMark } from './Logo';
import { Icon } from './Icons';
import type { SidebarProps } from '../types/props';

const COLLAPSE_KEY = 'gequ_sidebar_collapsed';

/**
 * Desktop navigation.
 *
 * Today is pinned above the sections because it is where the user should
 * return, not one destination among nineteen. Sections expand to show their
 * screens only when you are inside them — the alternative, every group open at
 * once, puts the whole app's structure on screen and makes the user hold it in
 * their head.
 *
 * Hidden on small screens; `BottomNav` takes over there.
 */
export function Sidebar({ theme, setTheme, energy, todayLog, prefs, reminderCount, levelInfo, onRoulette }: SidebarProps) {
    const { t } = useTranslation(['common', 'nav']);
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [collapsed]);

    const { pathname } = useLocation();
    const currentSection = sectionForPath(pathname);
    const hidden: string[] = prefs?.hiddenTabs ?? [];
    const visible = (items: NavItem[]) => items.filter(i => !hidden.includes(i.id));

    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);
    const energyColor = energy >= 7 ? 'bg-green-400' : energy >= 4 ? 'bg-yellow-400' : 'bg-red-400';

    return (
        <aside
            aria-label={t('common:nav.main')}
            className={`${collapsed ? 'w-[68px]' : 'w-60'} shrink-0 h-full hidden md:flex flex-col bg-[var(--bg-card)] border-r border-[var(--border)] backdrop-blur-md overflow-hidden transition-[width] duration-200 motion-reduce:transition-none`}
        >
            <div className={`flex items-center px-3 h-14 shrink-0 border-b border-[var(--border)] ${collapsed ? 'flex-col justify-center gap-2 h-auto py-3' : 'justify-between'}`}>
                {collapsed ? <LogoMark size={24} /> : <Logo />}
                <div className="flex items-center gap-1.5">
                    <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: 'w-6 h-6' } }} />
                    <button
                        onClick={() => setCollapsed(c => !c)}
                        aria-label={collapsed ? t('common:nav.expand') : t('common:nav.collapse')}
                        aria-expanded={!collapsed}
                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-cyan-400 hover:bg-white/5 transition"
                    >
                        <Icon name={collapsed ? 'chevronRight' : 'chevronLeft'} size={16} />
                    </button>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 flex flex-col gap-1">
                <NavLink
                    to={TODAY_ITEM.path}
                    end
                    title={collapsed ? t(TODAY_ITEM.labelKey) : undefined}
                    className={({ isActive }) => rowClass(isActive, collapsed)}
                >
                    <Icon name={TODAY_ITEM.icon} size={16} />
                    {!collapsed && <span className="truncate flex-1">{t(TODAY_ITEM.labelKey)}</span>}
                </NavLink>

                {SECTIONS.filter(s => s.id !== 'today' && s.id !== 'profile').map(section => {
                    const items = visible(section.items);
                    if (items.length === 0) return null;
                    const isCurrent = currentSection?.id === section.id;

                    return (
                        <div key={section.id} className="mt-2">
                            {!collapsed && (
                                <div className="px-2 mb-1 text-[10px] uppercase tracking-wider text-[var(--text-muted)] select-none">
                                    {t(section.titleKey)}
                                </div>
                            )}
                            <div className="flex flex-col gap-0.5">
                                {/* Collapsed to the section itself unless you are inside it —
                                    the screens appear when they become relevant. */}
                                {(isCurrent || collapsed ? items : items.slice(0, 3)).map(item => (
                                    <NavLink
                                        key={item.id}
                                        to={item.path}
                                        title={collapsed ? t(item.labelKey) : undefined}
                                        className={({ isActive }) => rowClass(isActive, collapsed)}
                                    >
                                        <Icon name={item.icon} size={16} />
                                        {!collapsed && <span className="truncate flex-1">{t(item.labelKey)}</span>}
                                        {!collapsed && item.id === 'calendar' && reminderCount > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                                                {reminderCount}
                                            </span>
                                        )}
                                    </NavLink>
                                ))}
                                {!collapsed && !isCurrent && items.length > 3 && (
                                    <NavLink
                                        to={section.path}
                                        className="px-2 py-1 rounded-lg flex items-center gap-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition"
                                    >
                                        <Icon name="chevronDown" size={11} />
                                        {t('common:nav.showMore', { count: items.length - 3 })}
                                    </NavLink>
                                )}
                            </div>
                        </div>
                    );
                })}
            </nav>

            <ProfileBlock
                collapsed={collapsed}
                level={level}
                levelPct={levelPct}
                energy={energy}
                energyColor={energyColor}
                dayClosed={Boolean(todayLog)}
                theme={theme}
                setTheme={setTheme}
                onRoulette={onRoulette}
            />
        </aside>
    );
}

function rowClass(isActive: boolean, collapsed: boolean): string {
    return `w-full text-left px-2 py-1.5 rounded-lg transition flex items-center gap-2.5 text-sm border ${
        isActive
            ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
            : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)] border-transparent'
    } ${collapsed ? 'justify-center' : ''}`;
}

type ProfileBlockProps = {
    collapsed: boolean;
    level: number;
    levelPct: number;
    energy: number;
    energyColor: string;
    dayClosed: boolean;
    theme: SidebarProps['theme'];
    setTheme: SidebarProps['setTheme'];
    onRoulette: () => void;
};

function ProfileBlock({ collapsed, level, levelPct, energy, energyColor, dayClosed, theme, setTheme, onRoulette }: ProfileBlockProps) {
    const { t } = useTranslation(['common', 'nav']);
    const { pathname } = useLocation();
    const onProfile = pathname.startsWith('/profile');

    return (
        <div className={`mt-1 mx-3 mb-3 rounded-xl bg-[var(--bg-input)] border shrink-0 ${
            onProfile ? 'border-cyan-400/30' : 'border-[var(--border)]'
        }`}>
            <NavLink
                to="/profile"
                title={collapsed ? t('common:nav.profileWithLevel', { level }) : t('common:nav.openProfile')}
                className={`block w-full text-left rounded-t-xl hover:bg-white/5 transition ${collapsed ? 'p-2' : 'p-2.5'}`}
            >
                {collapsed ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-cyan-400/15 text-cyan-400 text-[11px] font-bold flex items-center justify-center">
                            {level}
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                            <div className={`h-full ${energyColor}`} style={{ width: `${(energy / 10) * 100}%` }} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-full bg-cyan-400/15 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0">
                                {level}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="text-[11px] text-[var(--text-muted)]">{t('common:profile.level', { level })}</div>
                                <div className="w-full h-1 rounded-full bg-black/30 overflow-hidden mt-1">
                                    <div className="h-full bg-cyan-400" style={{ width: `${levelPct}%` }} />
                                </div>
                            </div>
                            <Icon name="chevronRight" size={13} className="text-[var(--text-muted)] shrink-0" />
                        </div>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] text-[var(--text-muted)]">{t('common:profile.energy')}</span>
                            <span className="text-[11px] font-bold tabular-nums">
                                {dayClosed ? `${energy.toFixed(1)}/10` : '—'}
                            </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                            <div className={`h-full ${energyColor}`} style={{ width: `${dayClosed ? (energy / 10) * 100 : 0}%` }} />
                        </div>
                    </>
                )}
            </NavLink>

            <div className={`flex items-center border-t border-[var(--border)] ${collapsed ? 'flex-col' : ''}`}>
                <button
                    onClick={onRoulette}
                    aria-label={t('common:dopamine.roulette')}
                    className={`flex items-center justify-center py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition hover:bg-white/5 ${
                        collapsed ? 'w-full border-b border-[var(--border)]' : 'px-3 border-r border-[var(--border)]'
                    }`}
                >
                    <Icon name="dice" size={15} />
                </button>
                <NavLink
                    to="/profile/settings"
                    className={({ isActive }) => `flex-1 flex items-center justify-center gap-2 py-2 text-xs transition hover:bg-white/5 ${
                        isActive ? 'text-cyan-400' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                >
                    <Icon name="settings" size={15} />
                    {!collapsed && <span>{t('nav:items.settings.label')}</span>}
                </NavLink>
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    aria-label={theme === 'dark' ? t('common:theme.toLight') : t('common:theme.toDark')}
                    className={`flex items-center justify-center py-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition hover:bg-white/5 ${
                        collapsed ? 'w-full border-t border-[var(--border)]' : 'px-3 border-l border-[var(--border)]'
                    }`}
                >
                    <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
                </button>
            </div>
        </div>
    );
}
