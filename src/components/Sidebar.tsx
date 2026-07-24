export function Sidebar({ page, setPage, theme, setTheme, energy, todayLog }: any) {
    const navItems = [
        { id: 'dashboard', icon: '⬢', label: 'Дашборд' },
        { id: 'gym', icon: '🏋️', label: 'Зал' },
        { id: 'kanban', icon: '📋', label: 'Канбан' },
        { id: 'habits', icon: '♻️', label: 'Привычки' },
        { id: 'goals', icon: '🚩', label: 'Цели' },
        { id: 'diary', icon: '📓', label: 'Дневник' },
        { id: 'notes', icon: '📌', label: 'Записки' },
        { id: 'dynamics', icon: '📈', label: 'Динамика' },
        { id: 'hub', icon: '📊', label: 'Хаб' },
        { id: 'circles', icon: '🎯', label: 'Круги' },
        { id: 'training', icon: '🎯', label: 'Тренировки' },
        { id: 'knowledge', icon: '📚', label: 'База знаний' },
        { id: 'about', icon: '🧠', label: 'Про СДВГ' },
        { id: 'settings', icon: '⚙️', label: 'Настройки' },
    ];

    const energyColor = energy >= 7 ? 'bg-green-400' : energy >= 4 ? 'bg-yellow-400' : 'bg-red-400';
    const energyText = energy >= 7 ? 'Полный заряд!' : energy >= 4 ? 'Средний заряд' : 'На исходе';
    const energyWidth = `${(energy / 10) * 100}%`;

    return (
        <aside className="w-60 p-6 border-r border-[var(--border)] flex flex-col gap-2 backdrop-blur-md overflow-y-auto">
            <div className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                GeQu
            </div>
            
            {navItems.map(item => (
                <div key={item.id} onClick={() => setPage(item.id)}
                    className={`p-3 rounded-lg cursor-pointer transition flex items-center gap-3 ${
                        page === item.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-gray-400 hover:bg-white/5 hover:text-white border border-transparent'
                    }`}>
                    <span>{item.icon}</span> {item.label}
                </div>
            ))}

            {/* Энергетическая Батарейка */}
            <div className="mt-4 p-3 rounded-xl bg-[var(--bg-input)] border border-[var(--border)] group relative">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400">Энергия</span>
                    <span className="text-xs font-bold text-white">{energy.toFixed(1)}/10</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
                    <div className={`h-full ${energyColor} transition-all duration-500`} style={{ width: energyWidth }}></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{energyText}</div>
                
                {/* Детальный разбор при наведении */}
                {todayLog && (
                    <div className="absolute left-full ml-2 top-0 w-48 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                        <p className="text-xs text-gray-400 mb-2">Разбор энергии:</p>
                        <p className="text-xs text-white">Сон: <span className="text-purple-400">{(todayLog.sleep * 0.4).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Настроение: <span className="text-purple-400">{(todayLog.mood * 0.3).toFixed(1)}</span></p>
                        <p className="text-xs text-white">Фокус: <span className="text-purple-400">{(todayLog.focus * 0.3).toFixed(1)}</span></p>
                    </div>
                )}
            </div>

            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
                    className="mt-2 p-3 rounded-lg text-gray-400 hover:bg-white/5 border border-[var(--border)]">
                {theme === 'dark' ? '☀️ Светлая тема' : '🌙 Тёмная тема'}
            </button>
        </aside>
    );
}
