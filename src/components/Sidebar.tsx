import { useState, useEffect } from 'react';

type NavItem = { id: string; icon: string; label: string };
type NavGroup = { title: string; items: NavItem[] };

// Grouped navigation keeps 14 destinations scannable instead of one long list.
const NAV_GROUPS: NavGroup[] = [
    {
        title: 'Каждый день',
        items: [
            { id: 'dashboard', icon: '⬢', label: 'Дашборд' },
            { id: 'aiplan', icon: '🤖', label: 'ИИ-план дня' },
            { id: 'diary', icon: '📓', label: 'Дневник' },
            { id: 'notes', icon: '📌', label: 'Записки' },
            { id: 'habits', icon: '♻️', label: 'Привычки' },
        ],
    },
    {
        title: 'Дела',
        items: [
            { id: 'kanban', icon: '📋', label: 'Канбан' },
            { id: 'goals', icon: '🚩', label: 'Цели' },
            { id: 'circles', icon: '⭕', label: 'Круги' },
        ],
    },
    {
        title: 'Тело и мозг',
        items: [
            { id: 'gym', icon: '🏋️', label: 'Зал' },
            { id: 'training', icon: '🎯', label: 'Тренировки' },
        ],
    },
    {
        title: 'Анализ',
        items: [
            { id: 'progress', icon: '🏆', label: 'Прогресс' },
            { id: 'dynamics', icon: '📈', label: 'Динамика' },
            { id: 'hub', icon: '📊', label: 'Хаб' },
        ],
    },
    {
        title: 'Справка',
        items: [
            { id: 'knowledge', icon: '📚', label: 'База знаний' },
            { id: 'about', icon: '🧠', label: 'Про СДВГ' },
            { id: 'settings', icon: '⚙️', label: 'Настройки' },
        ],
    },
];

const COLLAPSE_KEY = 'gequ_sidebar_collapsed';

export function Sidebar({ page, setPage, theme, setTheme, energy, todayLog }: any) {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
    });

    useEffect(() => {
        try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ }
    }, [collapsed]);

    const energyColor = energy >= 7 ? 'bg-green-400' : energy >= 4 ? 'bg-yellow-400' : 'bg-red-400';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;

    return (
        <aside className={`${collapsed ? 'w-[68px]' : 'w-56'} shrink-0 py-4 px-3 border-r border-[var(--border)] flex flex-col backdrop-blur-md overflow-y-auto overflow-x-hidden transition-[width] duration-200`}>
            {/* Header: logo + collapse toggle */}
            <div className="flex items-center justify-between mb-4 px-1">
                {!collapsed && (
                    <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        GeQu
                    </span>
                )}
                <button
                    onClick={() => setCollapsed((c: boolean) => !c)}
                    title={collapsed ? 'Развернуть меню' : 'Свернуть меню'}
                    className={`text-gray-500 hover:text-cyan-400 transition p-1 rounded ${collapsed ? 'mx-auto' : ''}`}
                >
                    {collapsed ? '»' : '«'}
                </button>
            </div>

            {/* Grouped navigation */}
            <nav className="flex flex-col gap-3 flex-1">
                {NAV_GROUPS.map(group => (
                    <div key={group.title}>
                        {!collapsed && (
                            <div className="text-[10px] uppercase tracking-wider text-gray-600 px-2 mb-1 select-none">
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
                                        className={`w-full text-left px-2 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-2.5 text-sm border ${
                                            active
                                                ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20'
                                                : 'text-gray-400 hover:bg-white/5 hover:text-white border-transparent'
                                        } ${collapsed ? 'justify-center' : ''}`}
                                    >
                                        <span className="text-base leading-none">{item.icon}</span>
                                        {!collapsed && <span className="truncate">{item.label}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </nav>

            {/* Energy battery */}
            <div className={`mt-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] group relative ${collapsed ? 'p-2' : 'p-2.5'}`}>
                {collapsed ? (
                    <div className="flex flex-col items-center gap-1" title={`Энергия ${energy.toFixed(1)}/10 — ${energyText}`}>
                        <span className="text-[10px] font-bold text-white">{energy.toFixed(1)}</span>
                        <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                            <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }} />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] text-gray-400">Энергия</span>
                            <span className="text-[11px] font-bold text-white">{energy.toFixed(1)}/10</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                            <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }} />
                        </div>
                        <div className="text-[10px] text-gray-500 mt-1">{energyText}</div>
                    </>
                )}

                {/* Breakdown on hover */}
                {todayLog && (
                    <div className="absolute left-full ml-2 bottom-0 w-48 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="text-xs text-gray-400 mb-2">Разбор энергии:</p>
                        <p className="text-xs text-white">Сон: <span className="text-purple-400">{(todayLog.sleep * 0.4).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Настроение: <span className="text-purple-400">{(todayLog.mood * 0.3).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Фокус: <span className="text-purple-400">{(todayLog.focus * 0.3).toFixed(1)}</span></p>
                    </div>
                )}
            </div>

            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
                className={`mt-2 py-1.5 px-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 border border-[var(--border)] text-sm ${collapsed ? 'text-center' : 'text-left'}`}
            >
                {collapsed ? (theme === 'dark' ? '☀️' : '🌙') : (theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема')}
            </button>
        </aside>
    );
}
