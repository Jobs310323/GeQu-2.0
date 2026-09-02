import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { toLocalDateKey } from '../lib/datetime';
import { weekdayNames, monthStartOffset, monthAndYear } from '../lib/format';
import type { CalendarProps } from '../types/props';

// Weekday and month names come from `Intl` rather than a table here. That is
// not only about language: `en-US` starts its week on Sunday and `ru` on
// Monday, and this grid used to hardcode Monday, which would have put every
// date in the wrong column for an English user.

type EventKind = 'workout' | 'log' | 'diary' | 'reminder';

const KINDS: Record<EventKind, { color: string; labelKey: string; icon: string }> = {
    workout:  { color: '#EA580C', labelKey: 'track:calendar.kind.workout', icon: 'dumbbell' },
    log:      { color: '#0284C7', labelKey: 'track:calendar.kind.log', icon: 'moon' },
    diary:    { color: '#7C3AED', labelKey: 'track:calendar.kind.diary', icon: 'book' },
    reminder: { color: '#DB2777', labelKey: 'track:calendar.kind.reminder', icon: 'bell' },
};

// This page worked the timezone problem out first; `toLocalDateKey` is that
// same fix, moved to lib/datetime so the rest of the app shares it.
const dayKey = toLocalDateKey;

export function CalendarPage({ logs, diary, gymData, reminders, setReminders }: CalendarProps) {
    const { t } = useTranslation(['track', 'common']);
    const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [selected, setSelected] = useState<string>(() => dayKey(new Date()));
    const [draft, setDraft] = useState('');

    const todayKey = dayKey(new Date());

    // Index each source by local day once — every cell lookup is then O(1).
    const index = useMemo(() => {
        const m: Record<string, Set<EventKind>> = {};
        const add = (k: string, kind: EventKind) => { (m[k] ||= new Set()).add(kind); };
        (logs ?? []).forEach((l) => l?.date && add(dayKey(l.date), 'log'));
        (diary ?? []).forEach((e) => e?.date && add(dayKey(e.date), 'diary'));
        (gymData?.history ?? []).forEach((w) => w?.date && add(dayKey(w.date), 'workout'));
        (reminders ?? []).forEach((r) => r?.date && add(r.date, 'reminder'));
        return m;
    }, [logs, diary, gymData, reminders]);

    const grid = useMemo(() => {
        const y = cursor.getFullYear(), mo = cursor.getMonth();
        const startOffset = monthStartOffset(cursor);
        const total = new Date(y, mo + 1, 0).getDate();
        const cells: (Date | null)[] = Array(startOffset).fill(null);
        for (let d = 1; d <= total; d++) cells.push(new Date(y, mo, d));
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [cursor]);

    const dayItems = useMemo(() => ({
        reminders: (reminders ?? []).filter((r) => r.date === selected),
        workouts: (gymData?.history ?? []).filter((w) => dayKey(w.date) === selected),
        diary: (diary ?? []).filter((e) => dayKey(e.date) === selected),
        log: (logs ?? []).find((l) => dayKey(l.date) === selected) ?? null,
    }), [selected, reminders, gymData, diary, logs]);

    const upcoming = useMemo(() =>
        (reminders ?? [])
            .filter((r) => !r.done && r.date >= todayKey)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 8),
        [reminders, todayKey]);

    // Counts for the month currently on screen.
    const monthStats = useMemo(() => {
        const prefix = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const count = (kind: EventKind) =>
            Object.entries(index).filter(([k, kinds]) => k.startsWith(prefix) && kinds.has(kind)).length;
        return { log: count('log'), workout: count('workout'), diary: count('diary'), reminder: count('reminder') };
    }, [index, cursor]);

    const addReminder = () => {
        if (!draft.trim()) return;
        setReminders([...(reminders ?? []), { id: Date.now(), date: selected, text: draft.trim(), done: false }]);
        setDraft('');
    };
    const toggleReminder = (id: number) =>
        setReminders((reminders ?? []).map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
    const removeReminder = (id: number) =>
        setReminders((reminders ?? []).filter((r) => r.id !== id));

    const shift = (d: number) => setCursor(c => new Date(c.getFullYear(), c.getMonth() + d, 1));
    const goToday = () => {
        const now = new Date();
        setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
        setSelected(dayKey(now));
    };

    const selectedDate = new Date(selected + 'T12:00:00');

    return (
        <div className="max-w-6xl">
            <PageHeader page="calendar" title={t('track:calendar.title')}
                subtitle={t('track:calendar.subtitle')} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Month grid */}
                <div className="lg:col-span-2 glass-card p-5 rounded-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => shift(-1)}
                                className="w-8 h-8 rounded-lg border border-[var(--border)] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/40 transition flex items-center justify-center">
                                <Icon name="chevronLeft" size={16} />
                            </button>
                            <button onClick={() => shift(1)}
                                className="w-8 h-8 rounded-lg border border-[var(--border)] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/40 transition flex items-center justify-center">
                                <Icon name="chevronRight" size={16} />
                            </button>
                            <h2 className="text-xl font-bold ml-2">
                                {monthAndYear(cursor)}
                            </h2>
                        </div>
                        <button onClick={goToday}
                            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white transition">
                            {t('track:calendar.today')}
                        </button>
                    </div>

                    <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                        {weekdayNames().map(w => (
                            <div key={w} className="text-[11px] text-gray-500 text-center py-1">{w}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {grid.map((d, i) => {
                            if (!d) return <div key={i} />;
                            const key = dayKey(d);
                            const kinds = index[key];
                            const isToday = key === todayKey;
                            const isSelected = key === selected;
                            const dayReminders = (reminders ?? []).filter((r) => r.date === key && !r.done);
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelected(key)}
                                    className={`min-h-[68px] p-1.5 rounded-xl border text-left transition flex flex-col ${
                                        isSelected ? 'bg-cyan-400/10 border-cyan-400/50'
                                            : isToday ? 'bg-white/5 border-[var(--border)]'
                                            : 'border-[var(--border)] hover:bg-white/5'
                                    }`}
                                >
                                    <span className={`text-xs mb-1 ${
                                        isToday ? 'text-cyan-400 font-bold' : isSelected ? 'text-cyan-400' : 'text-gray-400'
                                    }`}>
                                        {d.getDate()}
                                    </span>

                                    {kinds && (
                                        <span className="flex gap-1 mb-1">
                                            {[...kinds].map(k => (
                                                <span key={k} className="w-1.5 h-1.5 rounded-full"
                                                    style={{ background: KINDS[k].color }} title={t(KINDS[k].labelKey)} />
                                            ))}
                                        </span>
                                    )}

                                    {dayReminders.slice(0, 2).map((r) => (
                                        <span key={r.id} className="text-[9px] text-pink-400 truncate leading-tight w-full">
                                            {r.text}
                                        </span>
                                    ))}
                                    {dayReminders.length > 2 && (
                                        <span className="text-[9px] text-gray-500">+{dayReminders.length - 2}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-2 mt-4 pt-4 border-t border-[var(--border)]">
                        {Object.entries(KINDS).map(([k, v]) => (
                            <span key={k} className="flex items-center gap-1.5 text-xs text-gray-400">
                                <span className="w-2 h-2 rounded-full" style={{ background: v.color }} />
                                {t(v.labelKey)}
                                <span className="text-gray-600">· {monthStats[k as keyof typeof monthStats]}</span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Selected day + upcoming */}
                <div className="space-y-6">
                    <div className="glass-card p-5 rounded-2xl">
                        <h3 className="font-bold text-cyan-400 mb-3">
                            {selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}
                        </h3>

                        <div className="space-y-2 mb-4">
                            {dayItems.log && (
                                <div className="text-sm text-gray-300 bg-[var(--bg-input)] p-2.5 rounded-lg border border-[var(--border)] flex items-center gap-2">
                                    <Icon name={KINDS.log.icon} size={14} className="text-[var(--text-muted)] shrink-0" />
                                    {t('track:calendar.logLine', { sleep: dayItems.log.sleep, focus: dayItems.log.focus, mood: dayItems.log.mood })}
                                </div>
                            )}
                            {dayItems.workouts.map((w) => (
                                <div key={w.id ?? w.date} className="text-sm text-gray-300 bg-[var(--bg-input)] p-2.5 rounded-lg border border-[var(--border)] flex items-center gap-2">
                                    <Icon name={KINDS.workout.icon} size={14} className="text-[var(--text-muted)] shrink-0" />
                                    {w.dayName || t('track:calendar.workoutFallback')}
                                    <span className="text-gray-500">{t('track:calendar.exerciseCount', { count: (w.exercises ?? []).length })}</span>
                                </div>
                            ))}
                            {dayItems.diary.map((e) => (
                                <div key={e.id} className="text-sm text-gray-300 bg-[var(--bg-input)] p-2.5 rounded-lg border border-[var(--border)] flex items-center gap-2">
                                    <Icon name={KINDS.diary.icon} size={14} className="text-[var(--text-muted)] shrink-0" />
                                    {String(e.content).slice(0, 80)}{String(e.content).length > 80 ? '…' : ''}
                                </div>
                            ))}
                            {!dayItems.log && !dayItems.workouts.length && !dayItems.diary.length && (
                                <p className="text-sm text-gray-500">{t('track:calendar.nothing')}</p>
                            )}
                        </div>

                        <div className="pt-3 border-t border-[var(--border)]">
                            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                                <Icon name="bell" size={13} />
                                {t('track:calendar.reminders')}
                            </div>
                            <div className="space-y-1.5 mb-3">
                                {dayItems.reminders.map((r) => (
                                    <div key={r.id} className="flex items-start gap-2 group">
                                        <input type="checkbox" checked={r.done} onChange={() => toggleReminder(r.id)}
                                            className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer" />
                                        <span className={`text-sm flex-1 ${r.done ? 'line-through text-gray-600' : 'text-gray-200'}`}>
                                            {r.text}
                                        </span>
                                        <button onClick={() => removeReminder(r.id)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition shrink-0">
                                            <Icon name="close" size={13} />
                                        </button>
                                    </div>
                                ))}
                                {dayItems.reminders.length === 0 && (
                                    <p className="text-xs text-gray-600">{t('track:calendar.noReminders')}</p>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addReminder()}
                                    placeholder={t('track:calendar.addReminder')}
                                    className="flex-1 min-w-0 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-400"
                                />
                                <button onClick={addReminder}
                                    className="px-4 rounded-lg bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold shrink-0">+</button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-5 rounded-2xl">
                        <h3 className="font-bold mb-3">{t('track:calendar.upcoming')}</h3>
                        {upcoming.length === 0 ? (
                            <p className="text-sm text-gray-500">{t('track:calendar.allClear')}</p>
                        ) : (
                            <div className="space-y-2">
                                {upcoming.map((r) => (
                                    <button key={r.id} onClick={() => {
                                        setSelected(r.date);
                                        const d = new Date(r.date + 'T12:00:00');
                                        setCursor(new Date(d.getFullYear(), d.getMonth(), 1));
                                    }}
                                        className="w-full text-left flex items-baseline gap-2 bg-[var(--bg-input)] p-2.5 rounded-lg border border-[var(--border)] hover:border-pink-400/40 transition">
                                        <span className="text-xs text-pink-400 whitespace-nowrap tabular-nums">
                                            {new Date(r.date + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                                        </span>
                                        <span className="text-sm text-gray-200 truncate">{r.text}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
