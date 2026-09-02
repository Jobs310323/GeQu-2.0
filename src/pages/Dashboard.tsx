import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateStreak } from '../lib/helpers';
import { Icon } from '../components/Icons';
import { RadialGauge } from '../components/RadialGauge';
import { todayKey, toLocalDateKey, instantForDateKey } from '../lib/datetime';
import { formatNumber } from '../lib/format';
import {
    HELPED_TAG_IDS, HINDERED_TAG_IDS, BODY_SCAN_ITEMS, AUTO_SCAN, tagLabel,
} from '../features/checkin/vocabulary';
import { useNavigate } from 'react-router';
import type { DashboardProps } from '../types/props';
import type { ReactNode, ElementType } from 'react';
import type { Habit } from '../types/domain';

const DAY_MS = 86400000;
/** How many entries in `items` fall inside the last `days` days. */
function countRecent(items: { date: string }[], days: number) {
    const from = Date.now() - days * DAY_MS;
    return (items ?? []).filter((i) => new Date(i.date).getTime() >= from).length;
}

/**
 * Collapsible card. The day-closing form used to stack eight always-open blocks
 * in one column, which meant a lot of scrolling past things not being filled in;
 * these fold away and show a one-line summary of what's inside instead.
 */
function Section({ icon, title, summary, filled, children, open, onToggle }: {
    icon: string; title: string; summary: string; filled: boolean;
    children: ReactNode; open: boolean; onToggle: () => void;
}) {
    return (
        <div className="glass-card rounded-2xl overflow-hidden">
            <button onClick={onToggle}
                className="w-full px-5 py-3.5 flex items-center gap-3 text-left hover:bg-white/5 transition">
                <Icon name={icon} size={18} className="text-[var(--text-muted)] shrink-0" />
                <span className="font-medium flex-1">{title}</span>
                {filled
                    ? <span className="text-xs text-green-400 truncate max-w-[45%]">{summary}</span>
                    : <span className="text-xs text-gray-600">{summary}</span>}
                <Icon name={open ? 'chevronDown' : 'chevronRight'} size={14} className="text-[var(--text-muted)] shrink-0" />
            </button>
            {open && <div className="px-5 pb-5 pt-1 border-t border-[var(--border)]">{children}</div>}
        </div>
    );
}

/** One number plus its caption, the building block of the overview grid. */
function StatTile({ icon, value, label, hint, tone = 'text-[var(--text-main)]', onClick }: {
    icon: string; value: ReactNode; label: string; hint?: string | undefined;
    tone?: string; onClick?: (() => void) | undefined;
}) {
    // A tile is a button when it navigates and a plain div otherwise, so a
    // non-interactive tile is not announced as actionable.
    const Tag: ElementType = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick}
            className={`glass-card rounded-2xl p-3 flex flex-col gap-1 text-left ${onClick ? 'hover:bg-white/5 transition' : ''}`}>
            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                <Icon name={icon} size={13} />
                <span className="text-[11px] uppercase tracking-wide truncate">{label}</span>
            </div>
            <div className={`text-2xl font-semibold leading-none ${tone}`}>{value}</div>
            {hint && <div className="text-[11px] text-[var(--text-muted)]">{hint}</div>}
        </Tag>
    );
}

export function Dashboard({ logs, setLogs, achievements, setHyperfocus, kanban, gymData, testResults,
                            prefs, habits, setHabits, levelInfo, energy }: DashboardProps) {
    const { t } = useTranslation(['today', 'common']);
    const navigate = useNavigate();
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

    const todayStr = todayKey();
    const [entryDate, setEntryDate] = useState(todayStr);
    const todayGym = gymData.history.some((w) => toLocalDateKey(w.date) === todayStr);
    const todayTest = testResults.some((t) => toLocalDateKey(t.date) === todayStr);

    // --- Overview figures --------------------------------------------------
    // Gauges show today's numbers once the day is closed, and the running
    // 7-day average before that — so the block is never empty.
    const todayLog = logs.find((l) => toLocalDateKey(l.date) === todayStr);
    const recentLogs = logs.filter((l) => new Date(l.date).getTime() >= Date.now() - 7 * DAY_MS);
    const avg = (key: 'sleep' | 'focus' | 'mood') => recentLogs.length
        ? recentLogs.reduce((s: number, l) => s + Number(l[key] ?? 0), 0) / recentLogs.length
        : 0;
    const gaugeSource = todayLog ?? (recentLogs.length ? { sleep: avg('sleep'), focus: avg('focus'), mood: avg('mood') } : null);
    const gaugeCaption = todayLog ? t('today:checkin.todayLabel')
        : recentLogs.length ? t('today:checkin.gaugeAverage')
        : t('today:checkin.gaugeNone');

    const habitList: Habit[] = habits ?? [];
    const habitsDone = habitList.filter((h) => h.history?.includes(todayStr)).length;
    const openTasks = kanban.filter((t) => t.status !== 'done');
    const nextTasks = openTasks.slice(0, 3);

    const level = levelInfo?.level ?? 1;
    const levelPct = Math.round((levelInfo?.progress ?? 0) * 100);
    const energyValue = typeof energy === 'number' ? energy : 5;

    const bodyScanItems = BODY_SCAN_ITEMS.map(item => ({
        id: item.id,
        icon: item.icon,
        label: t(item.key),
        auto: item.id === AUTO_SCAN.gym ? todayGym : item.id === AUTO_SCAN.test ? todayTest : false,
    }));
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
        setHabits(habitList.map((h) => {
            if (h.id !== id) return h;
            const done = h.history?.includes(todayStr);
            return { ...h, history: done ? h.history.filter((d: string) => d !== todayStr) : [...(h.history ?? []), todayStr] };
        }));
    };

    const gratitudeCount = gratitude.filter(g => g.trim()).length;
    const alreadyClosed = logs.some((l) => toLocalDateKey(l.date) === todayStr);

    const handleSave = () => {
        // Back-dated entries are stored at local noon of the chosen day, so the
        // record's own local date key round-trips to the day the user picked.
        const dateISO = instantForDateKey(entryDate);
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
        setToast(t('today:checkin.saved'));
        setTimeout(() => setToast(''), 2500);
    };

    const startHyper = () => {
        const todoTasks = kanban.filter((t) => t.status === 'todo' || t.status === 'doing');
        setHyperfocus({ status: 'setup', duration: 25, task: todoTasks[0]?.text || t('today:checkin.ownTask'), todoTasks });
    };

    const Slider = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
        <div>
            <div className="flex justify-between text-sm text-gray-400 mb-1.5">
                <span>{label}</span><span className="text-cyan-400 font-bold">{value}/10</span>
            </div>
            <input type="range" min="0" max="10" value={value}
                onChange={e => onChange(Number(e.target.value))} className="w-full accent-cyan-400" />
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                    <h1 className="text-2xl font-bold leading-tight">{t('today:checkin.heading')}</h1>
                    <p className="text-sm text-[var(--text-muted)]">
                        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                        {alreadyClosed && t('today:checkin.alreadyClosed')}
                    </p>
                </div>
                {show('hyperfocus') && (
                    <button onClick={startHyper}
                        className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-2.5 border border-cyan-400/30 hover:bg-cyan-400/10 transition">
                        <Icon name="rocket" size={18} className="text-cyan-400" />
                        <span className="font-medium text-cyan-400 text-sm">{t('today:checkin.hyperfocus')}</span>
                    </button>
                )}
            </div>

            {/* ---- Overview: how the last day / week actually went ---------- */}
            {show('overview') && (
                <div className="mb-4 space-y-3">
                    <div className="glass-card rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="t-label">{t('today:checkin.state')}</h2>
                            <span className="text-[11px] text-[var(--text-muted)]">{gaugeCaption}</span>
                        </div>
                        {gaugeSource ? (
                            <div className="grid grid-cols-3 gap-2">
                                <RadialGauge value={Number(gaugeSource.sleep)} label={t('today:checkin.sleep')} size={80} />
                                <RadialGauge value={Number(gaugeSource.focus)} label={t('today:checkin.focus')} size={80} color="var(--accent-purple)" />
                                <RadialGauge value={Number(gaugeSource.mood)} label={t('today:checkin.mood')} size={80} color="var(--accent-pink)" />
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--text-muted)] py-4 text-center">
                                {t('today:checkin.noGauges')}
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <StatTile icon="trophy" label={t('today:checkin.level')} value={level} hint={t('today:checkin.levelHint', { pct: levelPct })} tone="text-cyan-400" />
                        <StatTile icon="flame" label={t('today:checkin.energy')} value={formatNumber(energyValue, 1)}
                            hint={energyValue >= 7 ? t('today:checkin.energyFull') : energyValue >= 4 ? t('today:checkin.energyMid') : t('today:checkin.energyLow')} />
                        <StatTile icon="repeat" label={t('today:checkin.habits')} value={`${habitsDone}/${habitList.length}`}
                            hint={t('today:checkin.habitsHint')} onClick={() => navigate('/track/habits')} />
                        <StatTile icon="columns" label={t('today:checkin.tasks')} value={openTasks.length}
                            hint={t('today:checkin.tasksHint')} onClick={() => navigate('/plan/tasks')} />
                        {show('streak') && (
                            <StatTile icon="calendar" label={t('today:checkin.streak')} value={streak} hint={t('today:checkin.streakHint')} tone="text-pink-400" />
                        )}
                        {show('streak') && (
                            <StatTile icon="star" label={t('today:checkin.achievements')} value={achievements.length} hint={t('today:checkin.achievementsHint')} />
                        )}
                        <StatTile icon="dumbbell" label={t('today:checkin.workouts')} value={countRecent(gymData.history, 7)} hint={t('today:checkin.recent7')}
                            onClick={() => navigate('/track/body')} />
                        <StatTile icon="flask" label={t('today:checkin.tests')} value={countRecent(testResults, 7)} hint={t('today:checkin.recent7')}
                            onClick={() => navigate('/brain/train')} />
                    </div>
                </div>
            )}

            {/* ---- Today: the two things worth doing without leaving here --- */}
            {show('today') && (habitList.length > 0 || openTasks.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {habitList.length > 0 && (
                        <div className="glass-card rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="t-label">{t('today:checkin.habitsToday')}</h2>
                                <span className="text-[11px] text-[var(--text-muted)]">{t('today:checkin.habitsOf', { done: habitsDone, total: habitList.length })}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {habitList.map((h) => {
                                    const done = h.history?.includes(todayStr);
                                    return (
                                        <button key={h.id} onClick={() => toggleHabit(h.id)}
                                            className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1.5 transition ${
                                                done ? 'bg-green-400/15 border-green-400/40 text-green-400'
                                                     : 'bg-[var(--bg-input)] border-[var(--border)] text-[var(--text-muted)] hover:border-green-400/40'
                                            }`}>
                                            <Icon name="check" size={13} className={done ? '' : 'opacity-30'} />
                                            {h.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {openTasks.length > 0 && (
                        <div className="glass-card rounded-2xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="t-label">{t('today:checkin.upcomingTasks')}</h2>
                                <button onClick={() => navigate('/plan/tasks')}
                                    className="text-[11px] text-cyan-400 hover:underline">{t('today:checkin.allTasks', { count: openTasks.length })}</button>
                            </div>
                            <ul className="space-y-2">
                                {nextTasks.map((t) => (
                                    <li key={t.id} className="flex items-start gap-2 text-sm">
                                        <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                                            t.status === 'doing' ? 'bg-cyan-400' : 'bg-[var(--text-muted)]'
                                        }`} />
                                        <span className="text-[var(--text-main)] leading-snug">{t.text}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {alreadyClosed && (
                <div className="glass-card rounded-xl px-4 py-2.5 mb-4 text-sm text-green-400 border border-green-400/30">
                    {t('today:checkin.closedNotice')}
                </div>
            )}

            <div className="glass-card rounded-2xl px-5 py-3.5 mb-3 flex items-center gap-3">
                <Icon name="calendar" size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-sm font-medium">{t('today:checkin.entryDate')}</span>
                <input type="date" value={entryDate} max={todayStr} onChange={e => setEntryDate(e.target.value || todayStr)}
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-cyan-400" />
                {entryDate !== todayStr && (
                    <span className="text-xs text-[var(--text-muted)]">{t('today:checkin.backdating')}</span>
                )}
            </div>

            {/* ---- The day-closing form ------------------------------------ */}
            <div className="space-y-3">
                {show('ratings') && (
                    <Section icon="chart" title={t('today:checkin.ratings')} open={isOpen('ratings')} onToggle={() => toggle('ratings')}
                        filled summary={t('today:checkin.ratingsSummary', { sleep, focus, mood })}>
                        <div className="space-y-3 mt-3">
                            <Slider label={t('today:checkin.sleep')} value={sleep} onChange={setSleep} />
                            <Slider label={t('today:checkin.focus')} value={focus} onChange={setFocus} />
                            <Slider label={t('today:checkin.mood')} value={mood} onChange={setMood} />
                        </div>
                    </Section>
                )}

                {show('bodyscan') && (
                    <Section icon="search" title={t('today:checkin.bodyScan')} open={isOpen('bodyscan')} onToggle={() => toggle('bodyscan')}
                        filled={bodyScan.length > 0}
                        summary={bodyScan.length ? t('today:checkin.bodyScanSummary', { done: bodyScan.length, total: bodyScanItems.length }) : t('today:checkin.bodyScanEmpty')}>
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
                                        {item.auto && <span className="block text-[10px] text-green-400 mt-0.5">{t('today:checkin.auto')}</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </Section>
                )}

                {show('tags') && (
                    <Section icon="tag" title={t('today:checkin.tags')} open={isOpen('tags')} onToggle={() => toggle('tags')}
                        filled={helped.length + hindered.length > 0}
                        summary={helped.length + hindered.length
                            ? t('today:checkin.tagsSummary', { helped: helped.length, hindered: hindered.length })
                            : t('today:checkin.tagsEmpty')}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-3">
                            <div>
                                <div className="text-sm text-gray-400 mb-2">{t('today:checkin.helped')}</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[...HELPED_TAG_IDS, ...customHelped].map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'helped')}
                                            className={`px-3 py-1 rounded-full text-sm border transition ${
                                                helped.includes(tag) ? 'bg-green-400/20 border-green-400 text-green-400'
                                                                     : 'border-[var(--border)] text-gray-400 hover:border-green-400'
                                            }`}>{tagLabel(tag, t)}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={newHelpedTag} onChange={e => setNewHelpedTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag('helped'))}
                                        placeholder={t('today:checkin.ownTag')}
                                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-sm outline-none focus:border-green-400 text-white" />
                                    <button onClick={() => addCustomTag('helped')}
                                        className="px-3 py-1 rounded-lg text-sm border border-green-400/40 text-green-400 hover:bg-green-400/10">+</button>
                                </div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-400 mb-2">{t('today:checkin.hindered')}</div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {[...HINDERED_TAG_IDS, ...customHindered].map(tag => (
                                        <button key={tag} onClick={() => toggleTag(tag, 'hindered')}
                                            className={`px-3 py-1 rounded-full text-sm border transition ${
                                                hindered.includes(tag) ? 'bg-red-400/20 border-red-400 text-red-400'
                                                                       : 'border-[var(--border)] text-gray-400 hover:border-red-400'
                                            }`}>{tagLabel(tag, t)}</button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" value={newHinderedTag} onChange={e => setNewHinderedTag(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomTag('hindered'))}
                                        placeholder={t('today:checkin.ownTag')}
                                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-sm outline-none focus:border-red-400 text-white" />
                                    <button onClick={() => addCustomTag('hindered')}
                                        className="px-3 py-1 rounded-lg text-sm border border-red-400/40 text-red-400 hover:bg-red-400/10">+</button>
                                </div>
                            </div>
                        </div>
                    </Section>
                )}

                {show('mainEvent') && (
                    <Section icon="pin" title={t('today:checkin.mainEvent')} open={isOpen('mainEvent')} onToggle={() => toggle('mainEvent')}
                        filled={!!mainEvent.trim()}
                        summary={mainEvent.trim() ? mainEvent.trim().slice(0, 40) : t('today:checkin.notFilled')}>
                        <textarea value={mainEvent} onChange={e => setMainEvent(e.target.value)}
                            placeholder={t('today:checkin.mainEventPlaceholder')}
                            className="w-full mt-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                    </Section>
                )}

                {show('testTomorrow') && (
                    <Section icon="flask" title={t('today:checkin.testTomorrow')} open={isOpen('testTomorrow')} onToggle={() => toggle('testTomorrow')}
                        filled={!!testTomorrow.trim()}
                        summary={testTomorrow.trim() ? testTomorrow.trim().slice(0, 40) : t('today:checkin.notFilled')}>
                        <textarea value={testTomorrow} onChange={e => setTestTomorrow(e.target.value)}
                            placeholder={t('today:checkin.testTomorrowPlaceholder')}
                            className="w-full mt-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                    </Section>
                )}

                {show('gratitude') && (
                    <Section icon="heart" title={t('today:checkin.gratitude')} open={isOpen('gratitude')} onToggle={() => toggle('gratitude')}
                        filled={gratitudeCount > 0}
                        summary={gratitudeCount ? t('today:checkin.gratitudeSummary', { count: gratitudeCount }) : t('today:checkin.notFilled')}>
                        <p className="text-gray-500 text-xs mt-3 mb-2">{t('today:checkin.gratitudeBlurb')}</p>
                        <div className="space-y-2">
                            {gratitude.map((g, i) => (
                                <input key={i} type="text" value={g}
                                    onChange={e => setGratitude(prev => prev.map((item, idx) => idx === i ? e.target.value : item))}
                                    placeholder={t('today:checkin.gratitudePlaceholder', { n: i + 1 })}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 outline-none focus:border-pink-400 text-white" />
                            ))}
                        </div>
                    </Section>
                )}

                {show('customQuestion') && (
                    <Section icon="edit" title={t('today:checkin.customQuestion')} open={isOpen('customQuestion')} onToggle={() => toggle('customQuestion')}
                        filled={!!customQuestion.trim()}
                        summary={customQuestion.trim() ? customQuestion.trim().slice(0, 40) : t('today:checkin.notFilled')}>
                        <p className="text-gray-500 text-xs mt-3 mb-2">{t('today:checkin.customBlurb')}</p>
                        <input type="text" value={customQuestion} onChange={e => setCustomQuestion(e.target.value)}
                            placeholder={t('today:checkin.customPlaceholder')}
                            className="w-full mb-2 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 outline-none focus:border-cyan-400 text-white" />
                        <textarea value={customAnswer} onChange={e => setCustomAnswer(e.target.value)}
                            placeholder={t('today:checkin.customAnswer')} disabled={!customQuestion.trim()}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[60px] text-white disabled:opacity-50" />
                    </Section>
                )}
            </div>

            {/* Save stays reachable without scrolling back down the page. */}
            <div className="sticky bottom-0 -mx-1 mt-5 pt-3 pb-1 bg-gradient-to-t from-[var(--bg-main)] via-[var(--bg-main)] to-transparent">
                <button onClick={handleSave}
                    className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-xl text-lg">
                    {t('today:checkin.closeDay')}
                </button>
            </div>

            {toast && (
                <div className="fixed bottom-8 right-8 bg-[var(--bg-card)] border border-cyan-400 px-6 py-3 rounded-xl text-white shadow-xl anim-fade-in">
                    {toast}
                </div>
            )}
        </div>
    );
}
