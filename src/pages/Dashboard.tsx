import { useState } from 'react';
import { calculateStreak } from '../lib/helpers';
import { DASHBOARD_WIDGETS } from '../lib/prefs';
import { ALL_TABS } from '../lib/nav';

const WIDGET_TITLES: Record<string, string> = Object.fromEntries(
    DASHBOARD_WIDGETS.map(w => [w.id, w.label]));

const WIDGET_PAGE_LABEL: Record<string, string> = Object.fromEntries(
    ALL_TABS.map(t => [t.id, t.icon + ' ' + t.label]));

const HELPED_TAGS = ['Кофе', 'Спорт', 'Сон', 'Pomodoro', 'Интерес к задаче', 'Медитация'];
const HINDERED_TAGS = ['Телефон', 'Усталость', 'Шум', 'Скука', 'Голод', 'Откладывание'];

/**
 * Collapsible card. The dashboard used to stack eight always-open blocks in
 * one column, which meant a lot of scrolling past things not being filled in;
 * these fold away and show a one-line summary of what's inside instead.
 */
function Section({ icon, title, summary, filled, children, open, onToggle }: any) {
    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={onToggle}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-white/5 transition">
                <span className="text-lg leading-none">{icon}</span>
                <span className="font-medium flex-1">{title}</span>
                {filled
                    ? <span className="text-xs text-green-400 truncate max-w-[45%]">{summary}</span>
                    : <span className="text-xs text-gray-600">{summary}</span>}
                <span className="text-gray-500 text-xs">{open ? '▾' : '▸'}</span>
            </button>
            {open && <div className="px-5 pb-5 pt-1 border-t border-[var(--border)]">{children}</div>}
        </div>
    );
}

export function Dashboard({ logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults, prefs, onlyWidget, renderPage }: any) {
    const [sleep, setSleep] = useState(5);
    const [focus, setFocus] = useState(5);
    const [mood, setMood] = useState(5);
    const [helped, setHelped] = useState<string[]>([]);
    const [hindered, setHindered] = useState<string[]>([]);
    const [mainEvent, setMainEvent] = useState('');
    const [testTomorrow, setTestTomorrow] = useState('');
    const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
    const [toast, setToast] = useState('');

    // Only the day rating is open by default — the rest announce themselves
    // with a summary line and unfold on demand.
    const [openSections, setOpenSections] = useState<string[]>(['ratings']);
    const isOpen = (id: string) => onlyWidget ? true : openSections.includes(id);
    const toggle = (id: string) =>
        setOpenSections(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const streak = calculateStreak(logs);
    const hiddenWidgets: string[] = prefs?.hiddenWidgets ?? [];
    const asPage: string[] = prefs?.asPage ?? [];
    const asWidget: string[] = prefs?.asWidget ?? [];
    // In single-widget mode this component *is* the promoted page, so it shows
    // only that block. Otherwise: everything visible and not moved to the menu.
    const show = (id: string) =>
        onlyWidget ? id === onlyWidget : !hiddenWidgets.includes(id) && !asPage.includes(id);

    const todayStr = new Date().toISOString().split('T')[0];
    const todayGym = gymData.history.some((w: any) => w.date.split('T')[0] === todayStr);
    const todayTest = testResults.some((t: any) => t.date.split('T')[0] === todayStr);

    const bodyScanItems = [
        { id: '☀️ Солнце', label: 'Солнце > 15 мин', auto: false },
        { id: '💧 Вода', label: 'Вода 1.5+ л', auto: false },
        { id: '🍽 Питание', label: '3 приема без срывов', auto: false },
        { id: '📱 Без телефона', label: 'Без телефона 1ч', auto: false },
        { id: '🌿 Дыхание', label: 'Пауза/Дыхание', auto: false },
        { id: '📖 Чтение', label: 'Чтение 10+ стр', auto: false },
        { id: '🚶 Шаги', label: '5000+ шагов', auto: false },
        { id: '🎯 Задача', label: '1 главная задача', auto: false },
        { id: '🏋️ Зал', label: 'Тренировка', auto: todayGym },
        { id: '🎓 Тест', label: 'Когнитивный тест', auto: todayTest },
    ];
    const [bodyScan, setBodyScan] = useState<string[]>(bodyScanItems.filter(b => b.auto).map(b => b.id));

    const toggleScan = (id: string) => setBodyScan(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
    const toggleTag = (tag: string, type: 'helped' | 'hindered') => {
        const set = type === 'helped' ? setHelped : setHindered;
        set(prev => prev.includes(tag) ? prev.filter(s => s !== tag) : [...prev, tag]);
    };

    const gratitudeCount = gratitude.filter(g => g.trim()).length;
    const alreadyClosed = logs.some((l: any) => l.date.split('T')[0] === todayStr);

    const handleSave = () => {
        setLogs([...logs, {
            id: Date.now(),
            date: new Date().toISOString(),
            sleep, focus, mood,
            helped: [...helped, ...bodyScan],
            hindered, mainEvent, testTomorrow,
            gratitude: gratitude.filter(g => g.trim() !== ''),
        }]);
        setSleep(5); setFocus(5); setMood(5); setHelped([]); setHindered([]);
        setMainEvent(''); setTestTomorrow(''); setGratitude(['', '', '']);
        setToast('День закрыт! Запись сохранена.');
        setTimeout(() => setToast(''), 2500);
    };

    const startHyper = () => {
        const todoTasks = kanban.filter((t: any) => t.status === 'todo' || t.status === 'doing');
        setHyperfocus({ status: 'setup', duration: 25, task: todoTasks[0]?.text || 'Своя задача', todoTasks });
    };

    const Slider = ({ label, value, onChange }: any) => (
        <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1.5">
                <span>{label}</span><span className="text-cyan-400 font-bold">{value}/10</span>
            </div>
            <input type="range" min="0" max="10" value={value}
                onChange={e => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto pb-24">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                <h1 className="text-3xl font-bold">
                    {onlyWidget ? (WIDGET_TITLES[onlyWidget] ?? 'Закрытие дня') : 'Закрытие дня'}
                </h1>
                {!onlyWidget && (
                    <span className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                )}
            </div>

            {/* Compact status strip — was two large cards */}
            {!onlyWidget && (show('streak') || show('hyperfocus')) && (
                <div className="flex flex-wrap gap-3 mb-5">
                    {show('streak') && (
                        <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                            <span className="text-xl">🔥</span>
                            <div>
                                <div className="text-xl font-bold text-pink-400 leading-none">{streak}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">дней подряд</div>
                            </div>
                        </div>
                    )}
                    {show('streak') && (
                        <div className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5">
                            <span className="text-xl">🏆</span>
                            <div>
                                <div className="text-xl font-bold text-cyan-400 leading-none">{achievements.length}</div>
                                <div className="text-[11px] text-gray-500 mt-0.5">ачивок</div>
                            </div>
                        </div>
                    )}
                    {show('hyperfocus') && (
                        <button onClick={startHyper}
                            className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 border border-cyan-400/30 hover:bg-cyan-400/10 transition ml-auto">
                            <span className="text-xl">🚀</span>
                            <span className="font-bold text-cyan-400 text-sm">Гиперфокус</span>
                        </button>
                    )}
                </div>
            )}

            {alreadyClosed && !onlyWidget && (
                <div className="glass-card rounded-xl px-4 py-2.5 mb-4 text-sm text-green-400 border border-green-400/30">
                    ✓ Сегодняшний день уже закрыт — новая запись добавится отдельно.
                </div>
            )}

            <div className="space-y-3">
                {show('ratings') && (
                    <Section icon="📊" title="Оценка дня" open={isOpen('ratings')} onToggle={() => toggle('ratings')}
                        filled summary={`сон ${sleep} · фокус ${focus} · настроение ${mood}`}>
                        <div className="space-y-3 mt-3">
                            <Slider label="Сон" value={sleep} onChange={setSleep} />
                            <Slider label="Фокус" value={focus} onChange={setFocus} />
                            <Slider label="Настроение" value={mood} onChange={setMood} />
                        </div>
                    </Section>
                )}

                {show('bodyscan') && (
                    <Section icon="🔎" title="Сканирование тела" open={isOpen('bodyscan')} onToggle={() => toggle('bodyscan')}
                        filled={bodyScan.length > 0}
                        summary={bodyScan.length ? `${bodyScan.length} из ${bodyScanItems.length}` : 'ничего не отмечено'}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                            {bodyScanItems.map(item => {
                                const active = bodyScan.includes(item.id);
                                return (
                                    <button key={item.id} onClick={() => !item.auto && toggleScan(item.id)} disabled={item.auto}
                                        className={`p-2.5 rounded-xl border text-left transition ${
                                            active ? 'bg-green-400/20 border-green-400 text-white'
                                                   : 'bg-[var(--bg-input)] border-[var(--border)] text-gray-400 hover:border-green-400'
                                        } ${item.auto ? 'cursor-not-allowed opacity-80' : ''}`}>
                                        <span className="block text-sm font-medium">{item.id}</span>
                                        <span className="text-[11px] opacity-70">{item.label}</span>
                                        {item.auto && <span className="block text-[10px] text-green-400 mt-0.5">Авто</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {show('tags') && (
                    <Section icon="🏷️" title="Что помогло и что мешало" open={isOpen('tags')} onToggle={() => toggle('tags')}
                        filled={helped.length + hindered.length > 0}
                        summary={helped.length + hindered.length
                            ? `+${helped.length} / −${hindered.length}` : 'не отмечено'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                            <div>
                                <div className="text-sm text-gray-400 mb-2">✅ Помогло</div>
                                <div className="flex flex-wrap gap-2">
                                    {HELPED_TAGS.map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'helped')}
                                            className={`px-3 py-1 rounded-full text-sm border transition ${
                                                helped.includes(tag) ? 'bg-green-400/20 border-green-400 text-green-400'
                                                                     : 'border-[var(--border)] text-gray-400 hover:border-green-400'
                                            }`}>{tag}</button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-2">⚠️ Мешало</div>
                                <div className="flex flex-wrap gap-2">
                                    {HINDERED_TAGS.map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'hindered')}
                                            className={`px-3 py-1 rounded-full text-sm border transition ${
                                                hindered.includes(tag) ? 'bg-red-400/20 border-red-400 text-red-400'
                                                                       : 'border-[var(--border)] text-gray-400 hover:border-red-400'
                                            }`}>{tag}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {show('mainEvent') && (
                    <Section icon="📝" title="Главное событие дня" open={isOpen('mainEvent')} onToggle={() => toggle('mainEvent')}
                        filled={!!mainEvent.trim()}
                        summary={mainEvent.trim() ? mainEvent.trim().slice(0, 40) : 'не заполнено'}>
                        <textarea value={mainEvent} onChange={e => setMainEvent(e.target.value)}
                            placeholder="Что было самым важным сегодня?"
                            className="w-full mt-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                    </Section>
                )}

                {show('testTomorrow') && (
                    <Section icon="🔬" title="Что проверить завтра" open={isOpen('testTomorrow')} onToggle={() => toggle('testTomorrow')}
                        filled={!!testTomorrow.trim()}
                        summary={testTomorrow.trim() ? testTomorrow.trim().slice(0, 40) : 'не заполнено'}>
                        <textarea value={testTomorrow} onChange={e => setTestTomorrow(e.target.value)}
                            placeholder="Идея для эксперимента над собой..."
                            className="w-full mt-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                    </Section>
                )}

                {show('gratitude') && (
                    <Section icon="💖" title="За что благодарен" open={isOpen('gratitude')} onToggle={() => toggle('gratitude')}
                        filled={gratitudeCount > 0}
                        summary={gratitudeCount ? `${gratitudeCount} из 3` : 'не заполнено'}>
                        <p className="text-gray-500 text-xs mt-3 mb-2">Найди 3 хороших момента. В плохие дни они поддержат.</p>
                        <div className="space-y-2">
                            {gratitude.map((g, i) => (
                                <input key={i} type="text" value={g}
                                    onChange={e => setGratitude(prev => prev.map((item, idx) => idx === i ? e.target.value : item))}
                                    placeholder={`Момент ${i + 1}...`}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 outline-none focus:border-pink-400 text-white" />
                            ))}
                        </div>
                    </Section>
                )}
            </div>

            {/* Pages dragged onto the dashboard render here as mini-apps. */}
            {!onlyWidget && renderPage && asWidget.map((id: string) => {
                const el = renderPage(id);
                if (!el) return null;
                return (
                    <div key={id} className="glass-card rounded-2xl mt-4 overflow-hidden border border-purple-400/25">
                        <div className="px-4 py-2 text-xs uppercase tracking-wider text-purple-400 border-b border-[var(--border)] bg-purple-400/5">
                            {WIDGET_PAGE_LABEL[id] ?? id}
                        </div>
                        <div className="p-4 max-h-[520px] overflow-y-auto">{el}</div>
                    </div>
                );
            })}

            {/* Save stays reachable without scrolling back down the page. */}
            <div className="sticky bottom-0 -mx-1 mt-5 pt-3 pb-1 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent">
                <button onClick={handleSave}
                    className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg text-lg">
                    Закрыть день
                </button>
            </div>

            {toast && (
                <div className="fixed bottom-8 right-8 bg-[var(--bg-card)] border border-cyan-400 px-6 py-3 rounded-lg text-white shadow-xl anim-fade-in">
                    {toast}
                </div>
            )}
        </div>
    );
}
