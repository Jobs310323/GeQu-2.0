import { useState } from 'react';
import { getGroqKey, setGroqKey } from '../lib/ai';
import { NAV_GROUPS, LOCKED_TABS } from '../lib/nav';
import { DASHBOARD_WIDGETS, toggleIn } from '../lib/prefs';
import { LayoutArranger } from '../components/LayoutArranger';

export function Settings({ diary, logs, prefs, setPrefs }: any) {
    const hiddenTabs: string[] = prefs?.hiddenTabs ?? [];
    const hiddenWidgets: string[] = prefs?.hiddenWidgets ?? [];

    const toggleTab = (id: string) => {
        if (LOCKED_TABS.has(id)) return;
        setPrefs((p: any) => ({ ...p, hiddenTabs: toggleIn(p.hiddenTabs ?? [], id) }));
    };
    const toggleWidget = (id: string) =>
        setPrefs((p: any) => ({ ...p, hiddenWidgets: toggleIn(p.hiddenWidgets ?? [], id) }));
    const [groqKey, setGroqKeyState] = useState(getGroqKey());
    const [savedMsg, setSavedMsg] = useState('');
    const saveGroqKey = () => {
        setGroqKey(groqKey);
        setSavedMsg('Ключ сохранён ✓');
        setTimeout(() => setSavedMsg(''), 2500);
    };

    const exportTxt = () => { 
        let text = "=== Дневник GeQu ===\n\n"; 
        diary.forEach((d:any) => { text += `${new Date(d.date).toLocaleString('ru-RU')}\n${d.content}\n--------------------\n\n`; }); 
        downloadFile(text, "gequ_diary.txt", "text/plain"); 
    };
    
    const exportCsv = () => { 
        let csv = "Дата,Сон,Фокус,Настроение,Помогло,Мешало,Событие\n"; 
        logs.forEach((l:any) => { 
            const helped = l.helped ? l.helped.join('; ') : '';
            const hindered = l.hindered ? l.hindered.join('; ') : '';
            csv += `${new Date(l.date).toLocaleString('ru-RU')},${l.sleep},${l.focus},${l.mood},"${helped}","${hindered}","${l.mainEvent || ''}"\n`; 
        }); 
        downloadFile(csv, "gequ_logs.csv", "text/csv;charset=utf-8;"); 
    };
    
    const downloadFile = (content: string, fileName: string, mimeType: string) => { 
        const blob = new Blob([content], { type: mimeType }); 
        const url = URL.createObjectURL(blob); 
        const a = document.createElement('a'); 
        a.href = url; 
        a.download = fileName; 
        document.body.appendChild(a); 
        a.click(); 
        document.body.removeChild(a); 
        URL.revokeObjectURL(url); 
    };

    const exportAllData = () => {
        const backup: any = {};
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('gequ_')) {
                backup[key] = localStorage.getItem(key);
            }
        });
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gequ_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const importAllData = (e: any) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                Object.keys(data).forEach(key => {
                    if (key.startsWith('gequ_')) {
                        localStorage.setItem(key, data[key]);
                    }
                });
                alert("Данные успешно загружены! Страница будет перезагружена.");
                window.location.reload();
            } catch {
                alert("Ошибка чтения файла. Убедитесь, что это резервная копия GeQu.");
            }
        };
        reader.readAsText(file);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Настройки и данные</h1>

            <LayoutArranger prefs={prefs} setPrefs={setPrefs} />

            {/* Which pages appear in the sidebar */}
            <div className="glass-card p-6 rounded-2xl mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-xl">🧭 Разделы меню</h2>
                    {hiddenTabs.length > 0 && (
                        <button onClick={() => setPrefs((p: any) => ({ ...p, hiddenTabs: [] }))}
                            className="text-xs text-cyan-400 hover:underline">
                            Показать все ({hiddenTabs.length} скрыто)
                        </button>
                    )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                    Убери ненужные разделы из меню — данные останутся на месте, раздел можно вернуть в любой момент.
                </p>
                <div className="space-y-4">
                    {NAV_GROUPS.map(group => (
                        <div key={group.id}>
                            <div className="text-[11px] uppercase tracking-wider text-gray-500 mb-2">{group.title}</div>
                            <div className="flex flex-wrap gap-2">
                                {group.items.map(item => {
                                    const locked = LOCKED_TABS.has(item.id);
                                    const visible = !hiddenTabs.includes(item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => toggleTab(item.id)}
                                            disabled={locked}
                                            title={locked ? 'Этот раздел нельзя скрыть' : visible ? 'Скрыть из меню' : 'Вернуть в меню'}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition flex items-center gap-2 ${
                                                locked ? 'border-[var(--border)] text-gray-500 cursor-not-allowed opacity-60'
                                                    : visible ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
                                                    : 'border-[var(--border)] text-gray-500 hover:text-white line-through'
                                            }`}
                                        >
                                            <span>{item.icon}</span>{item.label}
                                            {locked && <span className="text-[10px]">🔒</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Which blocks appear on the dashboard */}
            <div className="glass-card p-6 rounded-2xl mb-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-xl">🧩 Виджеты дашборда</h2>
                    {hiddenWidgets.length > 0 && (
                        <button onClick={() => setPrefs((p: any) => ({ ...p, hiddenWidgets: [] }))}
                            className="text-xs text-cyan-400 hover:underline">
                            Показать все ({hiddenWidgets.length} скрыто)
                        </button>
                    )}
                </div>
                <p className="text-gray-400 text-sm mb-4">
                    Оставь на «Закрытии дня» только то, что действительно заполняешь.
                </p>
                <div className="flex flex-wrap gap-2">
                    {DASHBOARD_WIDGETS.map(w => {
                        const visible = !hiddenWidgets.includes(w.id);
                        return (
                            <button
                                key={w.id}
                                onClick={() => toggleWidget(w.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm border transition flex items-center gap-2 ${
                                    visible ? 'bg-purple-400/10 text-purple-400 border-purple-400/30'
                                        : 'border-[var(--border)] text-gray-500 hover:text-white line-through'
                                }`}
                            >
                                <span>{w.icon}</span>{w.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                <h2 className="text-xl mb-2 text-purple-400">✨ ИИ (Groq)</h2>
                <p className="text-gray-400 mb-4 text-sm">
                    Бесплатный ключ берётся на <span className="text-purple-300">console.groq.com → API Keys</span>. Хранится только в этом браузере и используется для ИИ-функций (например, ИИ-тренер в Зале).
                </p>
                <div className="flex gap-3 flex-wrap items-center">
                    <input
                        type="password"
                        value={groqKey}
                        onChange={e => setGroqKeyState(e.target.value)}
                        placeholder="gsk_..."
                        autoComplete="off"
                        className="flex-1 min-w-[240px] bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 outline-none focus:border-purple-400 text-white font-mono text-sm"
                    />
                    <button onClick={saveGroqKey} className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg">Сохранить</button>
                    {savedMsg && <span className="text-green-400 text-sm">{savedMsg}</span>}
                </div>
                <p className="text-gray-500 text-xs mt-3">Ключ виден в этом браузере (devtools), поэтому используй отдельный ключ и при желании удаляй его после использования.</p>
            </div>

            <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/30 bg-cyan-400/5">
                <h2 className="text-xl mb-2 text-cyan-400">Резервное копирование (Всё приложение)</h2>
                <p className="text-gray-400 mb-4 text-sm">Сохраните все данные (Дневник, Тесты, Спортзал, Привычки) в один файл или загрузите из файла для переноса на другое устройство.</p>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportAllData} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Выгрузить всё (JSON)</button>
                    <label className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg cursor-pointer">
                        Загрузить из файла
                        <input type="file" accept=".json" onChange={importAllData} className="hidden" />
                    </label>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl mb-4">Экспорт отдельных данных</h2>
                <div className="flex gap-4 flex-wrap">
                    <button onClick={exportTxt} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Дневник (.txt)</button>
                    <button onClick={exportCsv} className="bg-white/5 text-white font-bold px-6 py-3 rounded-lg border border-[var(--border)]">Логи дней (.csv)</button>
                </div>
            </div>
        </div>
    );
}
