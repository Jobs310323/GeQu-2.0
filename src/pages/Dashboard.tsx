import { useState } from 'react';
import { calculateStreak } from '../lib/helpers';
import { dayISO, todayISO, DAY_MS } from '../lib/date';
import { Icon } from '../components/Icons';
import { RadialGauge } from '../components/RadialGauge';
import { GqTabs, GqPageHead } from '../components/GqTabs';

const HELPED_TAGS = ['Кофе', 'Спорт', 'Сон', 'Pomodoro', 'Интерес к задаче', 'Медитация'];
const HINDERED_TAGS = ['Телефон', 'Усталость', 'Шум', 'Скука', 'Голод', 'Откладывание'];

/** How many entries in `items` fall inside the last `days` days. */
function countRecent(items: any[], days: number) {
    const from = Date.now() - days * DAY_MS;
    return (items ?? []).filter((i: any) => new Date(i.date).getTime() >= from).length;
}

/**
 * Collapsible card. The day-closing form used to stack eight always-open blocks
 * in one column, which meant a lot of scrolling past things not being filled in;
 * these fold away and show a one-line summary of what's inside instead.
 */
function Section({ icon, title, summary, filled, children, open, onToggle }: any) {
    return (
        <div className="gq-glass overflow-hidden">
            <button onClick={onToggle}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left transition hover:bg-[var(--gq-row-hover)]">
                <Icon name={icon} size={18} className="shrink-0 text-[var(--gq-text-muted)]" />
                <span className="font-medium flex-1" style={{ color: 'var(--gq-text)' }}>{title}</span>
                <span className="text-xs truncate max-w-[45%]"
                    style={{ color: filled ? 'var(--gq-good)' : 'var(--gq-text-muted)', opacity: filled ? 1 : 0.7 }}>
                    {summary}
                </span>
                <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} className="shrink-0 text-[var(--gq-text-muted)]" />
            </button>
            {open && <div className="px-5 pb-5 pt-1" style={{ borderTop: '1px solid var(--gq-divider)' }}>{children}</div>}
        </div>
    );
}

/** One number plus its caption, the building block of the overview grid. */
function StatTile({ icon, value, label, hint, tone = 'var(--gq-text)', onClick }: any) {
    const Tag: any = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick}
            className={`gq-stat flex flex-col gap-1 text-left ${onClick ? 'transition hover:bg-[var(--gq-row-hover)]' : ''}`}>
            <div className="flex items-center gap-1.5" style={{ color: 'var(--gq-text-muted)' }}>
                <Icon name={icon} size={13} />
                <span className="text-[11px] uppercase tracking-wide truncate">{label}</span>
            </div>
            <div className="gq-display text-2xl font-bold leading-none" style={{ color: tone }}>{value}</div>
            {hint && <div className="text-[11px]" style={{ color: 'var(--gq-text-muted)' }}>{hint}</div>}
        </Tag>
    );
}

/** Rating threshold color, shared by the energy ring and each slider's live value. */
function ratingTone(v: number) { return v >= 7 ? 'var(--gq-good)' : v >= 4 ? 'var(--gq-warn)' : 'var(--gq-bad)'; }

/**
 * One labelled 0–10 slider. Lives at module scope on purpose: declared inside
 * `Dashboard` it was a fresh component type on every render, so React threw the
 * `<input type="range">` away and remounted it mid-drag.
 */
function Slider({ label, icon, value, onChange }: any) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] flex items-center gap-1.5 w-24 shrink-0" style={{ color: 'var(--gq-text)' }}>
                <Icon name={icon} size={13} className="text-[var(--gq-text-muted)]" />{label}
            </span>
            <div className="relative flex-1 h-4 flex items-center">
                <div className="absolute left-0 right-0 h-1 rounded-full" style={{ background: 'var(--gq-track-off)' }} />
                <input type="range" min="0" max="10" value={value}
                    onChange={e => onChange(Number(e.target.value))} className="gq-slider relative w-full" />
            </div>
            <span className="font-bold text-[12.5px] w-[38px] text-right shrink-0" style={{ color: ratingTone(value) }}>{value}/10</span>
        </div>
    );
}

export function Dashboard({ logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults,
                            prefs, habits, setHabits, setPage, levelInfo, energy }: any) {
    const [sleep, setSleep] = useState(5);
    const [focus, setFocus] = useState(5);
    const [mood, setMood] = useState(5);
    const [helped, setHelped] = useState<string[]>([]);
    const [hindered, setHindered] = useState<string[]>([]);
    const [customHelped, setCustomHelped] = useState<string[]>([]);
    const [customHindered, setCustomHindered] = useState<string[]>([]);
    const [newHelpedTag, setNewHelpedTag] = useState('');
    const [newHinderedTag, setNewHinderedTag] = useState('');
    const [mainEvent, setMainEvent] = useState('');
    const [testTomorrow, setTestTomorrow] = useState('');
    const [gratitude, setGratitude] = useState<string[]>(['', '', '']);
    const [customQuestion, setCustomQuestion] = useState('');
    const [customAnswer, setCustomAnswer] = useState('');
    const [toast, setToast] = useState('');

    // Only the day rating is open by default — the rest announce themselves
    // with a summary line and unfold on demand.
    const [openSections, setOpenSections] = useState<string[]>(['ratings']);
    const isOpen = (id: string) => openSections.includes(id);
    const toggle = (id: string) =>
        setOpenSections(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

    const streak = calculateStreak(logs);
    const hiddenWidgets: string[] = prefs?.hiddenWidgets ?? [];
    const show = (id: string) => !hiddenWidgets.includes(id);

    const todayStr = todayISO();
    const [entryDate, setEntryDate] = useState(todayStr);
    const todayGym = gymData.history.some((w: any) => dayISO(w.date) === todayStr);
    const todayTest = testResults.some((t: any) => dayISO(t.date) === todayStr);

    // --- Overview figures --------------------------------------------------
    // Gauges show today's numbers once the day is closed, and the running
    // 7-day average before that — so the block is never empty.
    const todayLog = logs.find((l: any) => dayISO(l.date) === todayStr);
    const recentLogs = logs.filter((l: any) => new Date(l.date).getTime() >= Date.now() - 7 * DAY_MS);
    const avg = (key: string) => recentLogs.length
        ? recentLogs.reduce((s: number, l: any) => s + Number(l[key] ?? 0), 0) / recentLogs.length
        : 0;
    const gaugeSource = todayLog ?? (recentLogs.length ? { sleep: avg('sleep'), focus: avg('focus'), mood: avg('mood') } : null);
    const gaugeCaption = todayLog ? 'Сегодня' : recentLogs.length ? 'В среднем за 7 дней' : 'Пока нет записей';

    const habitList: any[] = habits ?? [];
    const habitsDone = habitList.filter((h: any) => h.history?.includes(todayStr)).length;
    const openTasks = kanban.filter((t: any) => t.status !== 'done');
    const nextTasks = openTasks.slice(0, 3);

    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);
    const energyValue = typeof energy === 'number' ? energy : 5;

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
    const addCustomTag = (type: 'helped' | 'hindered') => {
        const raw = (type === 'helped' ? newHelpedTag : newHinderedTag).trim();
        if (!raw) return;
        const setList = type === 'helped' ? setCustomHelped : setCustomHindered;
        setList(prev => prev.includes(raw) ? prev : [...prev, raw]);
        toggleTag(raw, type);
        (type === 'helped' ? setNewHelpedTag : setNewHinderedTag)('');
    };

    /** Same toggle the Habits page uses, so ticking here is the same action. */
    const toggleHabit = (id: number) => {
        if (!setHabits) return;
        setHabits(habitList.map((h: any) => {
            if (h.id !== id) return h;
            const done = h.history?.includes(todayStr);
            return { ...h, history: done ? h.history.filter((d: string) => d !== todayStr) : [...(h.history ?? []), todayStr] };
        }));
    };

    const gratitudeCount = gratitude.filter(g => g.trim()).length;
    const alreadyClosed = logs.some((l: any) => dayISO(l.date) === todayStr);

    const handleSave = () => {
        const isToday = entryDate === todayStr;
        const dateISO = isToday ? new Date().toISOString() : new Date(`${entryDate}T12:00:00`).toISOString();
        setLogs([...logs, {
            id: Date.now(),
            date: dateISO,
            sleep, focus, mood,
            helped: [...helped, ...bodyScan],
            hindered, mainEvent, testTomorrow,
            gratitude: gratitude.filter(g => g.trim() !== ''),
            customQuestion: customQuestion.trim() || undefined,
            customAnswer: customQuestion.trim() ? customAnswer.trim() : undefined,
        }]);
        setSleep(5); setFocus(5); setMood(5); setHelped([]); setHindered([]);
        setMainEvent(''); setTestTomorrow(''); setGratitude(['', '', '']);
        setCustomQuestion(''); setCustomAnswer(''); setEntryDate(todayStr);
        setToast('День закрыт! Запись сохранена.');
        setTimeout(() => setToast(''), 2500);
    };

    const startHyper = () => {
        const todoTasks = kanban.filter((t: any) => t.status === 'todo' || t.status === 'doing');
        setHyperfocus({ status: 'setup', duration: 25, task: todoTasks[0]?.text || 'Своя задача', todoTasks });
    };

    // Live ring above the ratings form — recomputed from the sliders as they move,
    // separate from `energyValue` (the app-level figure shown in the overview tile).
    const liveEnergy = (sleep + focus + mood) / 3;

    return (
        <div className="gq-page">
            <div className="gq-blob1" />
            <div className="gq-blob2" />
            <div className="gq-page-inner gq-fade">
            <GqPageHead title="Ежедневный чекин" action={show('hyperfocus') && (
                <button onClick={startHyper}
                    className="gq-glass rounded-xl px-4 py-2.5 flex items-center gap-2.5 transition hover:bg-[var(--gq-row-hover)]">
                    <Icon name="rocket" size={18} className="text-[var(--gq-grad-a)]" />
                    <span className="font-medium text-sm" style={{ color: 'var(--gq-grad-a)' }}>Гиперфокус</span>
                </button>
            )} />
            <GqTabs page="dashboard" setPage={setPage} />

            <p className="text-sm -mt-3 mb-5" style={{ color: 'var(--gq-text-muted)' }}>
                {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                {alreadyClosed && ' · день закрыт'}
            </p>

            {/* ---- Overview: how the last day / week actually went ---------- */}
            {show('overview') && (
                <div className="mb-4 space-y-3">
                    <div className="gq-glass px-6 py-[22px] flex items-center gap-5">
                        <RadialGauge value={liveEnergy} label="" size={74} stroke={6} glow color={ratingTone(liveEnergy)} />
                        <div>
                            <div className="text-[11px] uppercase tracking-wide mb-0.5" style={{ color: 'var(--gq-text-muted)', letterSpacing: '0.06em' }}>Энергия сейчас</div>
                            <div className="text-sm" style={{ color: 'var(--gq-text)' }}>
                                Считается из сна, настроения и фокуса ниже — обновляется вживую.
                            </div>
                        </div>
                    </div>
                    <div className="gq-glass p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--gq-text-muted)' }}>Состояние</h3>
                            <span className="text-[11px]" style={{ color: 'var(--gq-text-muted)' }}>{gaugeCaption}</span>
                        </div>
                        {gaugeSource ? (
                            <div className="grid grid-cols-3 gap-2">
                                <RadialGauge value={Number(gaugeSource.sleep)} label="Сон" size={80} color="var(--gq-good)" />
                                <RadialGauge value={Number(gaugeSource.focus)} label="Фокус" size={80} color="var(--gq-grad-a)" />
                                <RadialGauge value={Number(gaugeSource.mood)} label="Настроение" size={80} color="var(--gq-grad-b)" />
                            </div>
                        ) : (
                            <p className="text-sm py-4 text-center" style={{ color: 'var(--gq-text-muted)' }}>
                                Закрой первый день — здесь появятся твои шкалы.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatTile icon="trophy" label="Уровень" value={level} hint={`${levelPct}% до следующего`} tone="var(--gq-grad-a)" />
                        <StatTile icon="flame" label="Энергия" value={energyValue.toFixed(1)} tone={ratingTone(energyValue)}
                            hint={energyValue >= 7 ? 'полный заряд' : energyValue >= 4 ? 'средний заряд' : 'на исходе'} />
                        <StatTile icon="repeat" label="Привычки" value={`${habitsDone}/${habitList.length}`}
                            hint="отмечено сегодня" onClick={setPage ? () => setPage('habits') : undefined} />
                        <StatTile icon="columns" label="Задачи" value={openTasks.length}
                            hint="в работе" onClick={setPage ? () => setPage('kanban') : undefined} />
                        {show('streak') && (
                            <StatTile icon="calendar" label="Серия" value={streak} hint="дней подряд" tone="var(--gq-grad-b)" />
                        )}
                        {show('streak') && (
                            <StatTile icon="star" label="Ачивки" value={achievements.length} hint="получено" />
                        )}
                        <StatTile icon="dumbbell" label="Тренировки" value={countRecent(gymData.history, 7)} hint="за 7 дней"
                            onClick={setPage ? () => setPage('gym') : undefined} />
                        <StatTile icon="flask" label="Тесты" value={countRecent(testResults, 7)} hint="за 7 дней"
                            onClick={setPage ? () => setPage('training') : undefined} />
                    </div>
                </div>
            )}

            {/* ---- Today: the two things worth doing without leaving here --- */}
            {show('today') && (habitList.length > 0 || openTasks.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {habitList.length > 0 && (
                        <div className="gq-glass p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--gq-text-muted)' }}>Привычки сегодня</h3>
                                <span className="text-[11px]" style={{ color: 'var(--gq-text-muted)' }}>{habitsDone} из {habitList.length}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {habitList.map((h: any) => {
                                    const done = h.history?.includes(todayStr);
                                    return (
                                        <button key={h.id} onClick={() => toggleHabit(h.id)}
                                            className={`gq-chip ${done ? 'active-good' : ''}`}>
                                            <Icon name="check" size={13} className={done ? '' : 'opacity-30'} />
                                            {h.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {openTasks.length > 0 && (
                        <div className="gq-glass p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--gq-text-muted)' }}>Ближайшие задачи</h3>
                                {setPage && (
                                    <button onClick={() => setPage('kanban')}
                                        className="text-[11px] hover:underline" style={{ color: 'var(--gq-grad-a)' }}>все {openTasks.length}</button>
                                )}
                            </div>
                            <ul className="space-y-2">
                                {nextTasks.map((t: any) => (
                                    <li key={t.id} className="flex items-start gap-2 text-sm">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                                            style={{ background: t.status === 'doing' ? 'var(--gq-grad-a)' : 'var(--gq-text-muted)' }} />
                                        <span className="leading-snug" style={{ color: 'var(--gq-text)' }}>{t.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {alreadyClosed && (
                <div className="gq-glass px-4 py-2.5 mb-4 text-sm" style={{ color: 'var(--gq-good)' }}>
                    Сегодняшний день уже закрыт — новая запись добавится отдельно.
                </div>
            )}

            <div className="gq-glass px-5 py-3.5 mb-3 flex items-center gap-3 flex-wrap">
                <Icon name="calendar" size={16} className="shrink-0 text-[var(--gq-text-muted)]" />
                <span className="text-sm font-medium" style={{ color: 'var(--gq-text)' }}>Дата записи</span>
                <input type="date" value={entryDate} max={todayStr} onChange={e => setEntryDate(e.target.value || todayStr)}
                    className="gq-input w-auto" />
                {entryDate !== todayStr && (
                    <span className="text-xs" style={{ color: 'var(--gq-text-muted)' }}>закрываем прошлый день задним числом</span>
                )}
            </div>

            {/* ---- The day-closing form ------------------------------------ */}
            <div className="space-y-3">
                {show('ratings') && (
                    <Section icon="chart" title="Оценка дня" open={isOpen('ratings')} onToggle={() => toggle('ratings')}
                        filled summary={`сон ${sleep} · фокус ${focus} · настроение ${mood}`}>
                        <div className="space-y-3 mt-3">
                            <Slider label="Сон" icon="moon" value={sleep} onChange={setSleep} />
                            <Slider label="Фокус" icon="target" value={focus} onChange={setFocus} />
                            <Slider label="Настроение" icon="smile" value={mood} onChange={setMood} />
                        </div>
                    </Section>
                )}

                {show('bodyscan') && (
                    <Section icon="search" title="Сканирование тела" open={isOpen('bodyscan')} onToggle={() => toggle('bodyscan')}
                        filled={bodyScan.length > 0}
                        summary={bodyScan.length ? `${bodyScan.length} из ${bodyScanItems.length}` : 'ничего не отмечено'}>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                            {bodyScanItems.map(item => {
                                const active = bodyScan.includes(item.id);
                                return (
                                    <button key={item.id} onClick={() => !item.auto && toggleScan(item.id)} disabled={item.auto}
                                        className={`p-2.5 rounded-xl border text-left transition ${item.auto ? 'cursor-not-allowed opacity-80' : ''}`}
                                        style={active
                                            ? { background: 'color-mix(in srgb, var(--gq-good) 20%, transparent)', borderColor: 'var(--gq-good)', color: 'var(--gq-text)' }
                                            : { background: 'var(--gq-chip-bg)', borderColor: 'var(--gq-chip-border)', color: 'var(--gq-text-muted)' }}>
                                        <span className="block text-sm font-medium">{item.id}</span>
                                        <span className="text-[11px] opacity-70">{item.label}</span>
                                        {item.auto && <span className="block text-[10px] mt-0.5" style={{ color: 'var(--gq-good)' }}>Авто</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {show('tags') && (
                    <Section icon="tag" title="Что помогло и что мешало" open={isOpen('tags')} onToggle={() => toggle('tags')}
                        filled={helped.length + hindered.length > 0}
                        summary={helped.length + hindered.length
                            ? `+${helped.length} / −${hindered.length}` : 'не отмечено'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                            <div>
                                <div className="text-[12.5px] mb-2 font-semibold" style={{ color: 'var(--gq-text)' }}>Что помогло сегодня</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[...HELPED_TAGS, ...customHelped].map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'helped')}
                                            className={`gq-chip ${helped.includes(tag) ? 'active-good' : ''}`}>{tag}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={newHelpedTag} onChange={e => setNewHelpedTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag('helped'))}
                                        placeholder="Свой вариант..." className="gq-input flex-1 py-1" />
                                    <button onClick={() => addCustomTag('helped')}
                                        className="gq-chip active-good">+</button>
                                </div>
                            </div>
                            <div>
                                <div className="text-[12.5px] mb-2 font-semibold" style={{ color: 'var(--gq-text)' }}>Что мешало</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[...HINDERED_TAGS, ...customHindered].map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'hindered')}
                                            className={`gq-chip ${hindered.includes(tag) ? 'active-bad' : ''}`}>{tag}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={newHinderedTag} onChange={e => setNewHinderedTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag('hindered'))}
                                        placeholder="Свой вариант..." className="gq-input flex-1 py-1" />
                                    <button onClick={() => addCustomTag('hindered')}
                                        className="gq-chip active-bad">+</button>
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {show('mainEvent') && (
                    <Section icon="pin" title="Главное событие дня" open={isOpen('mainEvent')} onToggle={() => toggle('mainEvent')}
                        filled={!!mainEvent.trim()}
                        summary={mainEvent.trim() ? mainEvent.trim().slice(0, 40) : 'не заполнено'}>
                        <textarea value={mainEvent} onChange={e => setMainEvent(e.target.value)}
                            placeholder="Что было самым важным сегодня?"
                            className="gq-input mt-3 min-h-[80px]" />
                    </Section>
                )}

                {show('testTomorrow') && (
                    <Section icon="flask" title="Что проверить завтра" open={isOpen('testTomorrow')} onToggle={() => toggle('testTomorrow')}
                        filled={!!testTomorrow.trim()}
                        summary={testTomorrow.trim() ? testTomorrow.trim().slice(0, 40) : 'не заполнено'}>
                        <textarea value={testTomorrow} onChange={e => setTestTomorrow(e.target.value)}
                            placeholder="Идея для эксперимента над собой..."
                            className="gq-input mt-3 min-h-[80px]" />
                    </Section>
                )}

                {show('gratitude') && (
                    <Section icon="heart" title="За что благодарен" open={isOpen('gratitude')} onToggle={() => toggle('gratitude')}
                        filled={gratitudeCount > 0}
                        summary={gratitudeCount ? `${gratitudeCount} из 3` : 'не заполнено'}>
                        <p className="text-xs mt-3 mb-2" style={{ color: 'var(--gq-text-muted)' }}>Найди 3 хороших момента. В плохие дни они поддержат.</p>
                        <div className="space-y-2">
                            {gratitude.map((g, i) => (
                                <input key={i} type="text" value={g}
                                    onChange={e => setGratitude(prev => prev.map((item, idx) => idx === i ? e.target.value : item))}
                                    placeholder={`Момент ${i + 1}...`}
                                    className="gq-input" />
                            ))}
                        </div>
                    </Section>
                )}

                {show('customQuestion') && (
                    <Section icon="edit" title="Свой вопрос" open={isOpen('customQuestion')} onToggle={() => toggle('customQuestion')}
                        filled={!!customQuestion.trim()}
                        summary={customQuestion.trim() ? customQuestion.trim().slice(0, 40) : 'не заполнено'}>
                        <p className="text-xs mt-3 mb-2" style={{ color: 'var(--gq-text-muted)' }}>Задай себе любой свой вопрос — он сохранится вместе с записью.</p>
                        <input type="text" value={customQuestion} onChange={e => setCustomQuestion(e.target.value)}
                            placeholder="Например: Что я откладывал сегодня?"
                            className="gq-input mb-2" />
                        <textarea value={customAnswer} onChange={e => setCustomAnswer(e.target.value)}
                            placeholder="Ответ..." disabled={!customQuestion.trim()}
                            className="gq-input min-h-[60px] disabled:opacity-50" />
                    </Section>
                )}
            </div>

            {/* Save stays reachable without scrolling back down the page. The bar
                floats over the page gradient, so it blurs what is behind it rather
                than fading into a flat colour that no longer exists here. */}
            <div className="sticky bottom-0 -mx-2 mt-5 px-2 pt-3 pb-2 rounded-t-2xl"
                style={{ background: 'var(--gq-glass-bg)', backdropFilter: 'blur(20px)' }}>
                <button onClick={handleSave} className="gq-btn w-full justify-center py-3 text-lg">
                    <Icon name="checkCircle" size={18} />
                    Закрыть день
                </button>
            </div>

            {toast && (
                <div className="fixed bottom-8 right-8 gq-glass px-6 py-3 shadow-xl gq-fade" style={{ color: 'var(--gq-text)' }}>
                    {toast}
                </div>
            )}
            </div>
        </div>
    );
}
