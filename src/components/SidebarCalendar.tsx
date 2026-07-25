import { useState, useMemo } from 'react';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

/** Marker colours — one per kind of thing that can land on a day. */
const KINDS = {
    workout:  { color: '#EA580C', label: 'Тренировка' },
    log:      { color: '#0284C7', label: 'День закрыт' },
    diary:    { color: '#7C3AED', label: 'Запись в дневнике' },
    reminder: { color: '#DB2777', label: 'Напоминание' },
};

const dayKey = (d: Date | string) =>
    (typeof d === 'string' ? new Date(d) : d).toLocaleDateString('sv-SE'); // YYYY-MM-DD, local

export function SidebarCalendar({ logs, diary, gymData, reminders, setReminders }: any) {
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
    const [selected, setSelected] = useState<string | null>(null);
    const [draft, setDraft] = useState('');

    // Index every source by local day so lookups are O(1) per cell.
    const marks = useMemo(() => {
        const m: Record<string, Set<string>> = {};
        const add = (key: string, kind: string) => { (m[key] ||= new Set()).add(kind); };
        (logs ?? []).forEach((l: any) => l?.date && add(dayKey(l.date), 'log'));
        (diary ?? []).forEach((e: any) => e?.date && add(dayKey(e.date), 'diary'));
        (gymData?.history ?? []).forEach((w: any) => w?.date && add(dayKey(w.date), 'workout'));
        (reminders ?? []).forEach((r: any) => r?.date && add(r.date, 'reminder'));
        return m;
    }, [logs, diary, gymData, reminders]);

    const grid = useMemo(() => {
        const year = cursor.getFullYear(), month = cursor.getMonth();
        const first = new Date(year, month, 1);
        const startOffset = (first.getDay() + 6) % 7; // make Monday the first column
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = Array(startOffset).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [cursor]);

    const todayKey = dayKey(new Date());

    const shiftMonth = (delta: number) =>
        setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));

    const addReminder = () => {
        if (!draft.trim() || !selected) return;
        setReminders([...(reminders ?? []), { id: Date.now(), date: selected, text: draft.trim(), done: false }]);
        setDraft('');
    };
    const toggleReminder = (id: number) =>
        setReminders((reminders ?? []).map((r: any) => (r.id === id ? { ...r, done: !r.done } : r)));
    const removeReminder = (id: number) =>
        setReminders((reminders ?? []).filter((r: any) => r.id !== id));

    // What's on the selected day.
    const dayItems = useMemo(() => {
        if (!selected) return null;
        return {
            reminders: (reminders ?? []).filter((r: any) => r.date === selected),
            workouts: (gymData?.history ?? []).filter((w: any) => dayKey(w.date) === selected),
            diary: (diary ?? []).filter((e: any) => dayKey(e.date) === selected),
            log: (logs ?? []).find((l: any) => dayKey(l.date) === selected) ?? null,
        };
    }, [selected, reminders, gymData, diary, logs]);

    const pendingCount = (reminders ?? []).filter((r: any) => !r.done && r.date >= todayKey).length;

    return (
        <div className="mt-3 border-t border-[var(--border)] pt-3">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition"
            >
                <span className="flex items-center gap-2">
                    <span className="text-base leading-none">📅</span>
                    <span>Календарь</span>
                </span>
                <span className="flex items-center gap-1.5">
                    {pendingCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 font-bold">
                            {pendingCount}
                        </span>
                    )}
                    <span className="text-xs">{open ? '▾' : '▸'}</span>
                </span>
            </button>

            {open && (
                <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5 px-1">
                        <button onClick={() => shiftMonth(-1)} className="text-gray-500 hover:text-cyan-400 px-1 text-sm">‹</button>
                        <span className="text-[11px] text-gray-300 font-medium">
                            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
                        </span>
                        <button onClick={() => shiftMonth(1)} className="text-gray-500 hover:text-cyan-400 px-1 text-sm">›</button>
                    </div>

                    <div className="grid grid-cols-7 gap-y-0.5 mb-1">
                        {WEEKDAYS.map(w => (
                            <div key={w} className="text-[9px] text-gray-600 text-center">{w}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-0.5">
                        {grid.map((d, i) => {
                            if (!d) return <div key={i} />;
                            const key = dayKey(d);
                            const kinds = marks[key];
                            const isToday = key === todayKey;
                            const isSelected = key === selected;
                            return (
                                <button
                                    key={i}
                                    onClick={() => setSelected(isSelected ? null : key)}
                                    title={kinds ? [...kinds].map(k => (KINDS as any)[k]?.label).join(', ') : undefined}
                                    className={`relative h-6 rounded text-[10px] transition flex items-start justify-center pt-0.5 ${
                                        isSelected ? 'bg-cyan-400/20 text-cyan-400 font-bold'
                                            : isToday ? 'bg-white/10 text-white font-bold'
                                            : 'text-gray-400 hover:bg-white/5'
                                    }`}
                                >
                                    {d.getDate()}
                                    {kinds && (
                                        <span className="absolute bottom-0.5 flex gap-[2px]">
                                            {[...kinds].slice(0, 4).map(k => (
                                                <span key={k} className="w-[3px] h-[3px] rounded-full"
                                                    style={{ background: (KINDS as any)[k]?.color }} />
                                            ))}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2 px-1">
                        {Object.entries(KINDS).map(([k, v]) => (
                            <span key={k} className="flex items-center gap-1 text-[9px] text-gray-500">
                                <span className="w-[5px] h-[5px] rounded-full" style={{ background: v.color }} />
                                {v.label}
                            </span>
                        ))}
                    </div>

                    {selected && dayItems && (
                        <div className="mt-3 p-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                            <div className="text-[11px] text-cyan-400 font-bold mb-2">
                                {new Date(selected).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                            </div>

                            {dayItems.log && (
                                <div className="text-[10px] text-gray-400 mb-1.5">
                                    🌙 День закрыт · сон {dayItems.log.sleep}, фокус {dayItems.log.focus}
                                </div>
                            )}
                            {dayItems.workouts.map((w: any) => (
                                <div key={w.id ?? w.date} className="text-[10px] text-gray-400 mb-1.5">
                                    🏋️ {w.dayName || 'Тренировка'}
                                </div>
                            ))}
                            {dayItems.diary.map((e: any) => (
                                <div key={e.id} className="text-[10px] text-gray-400 mb-1.5 truncate">
                                    📓 {String(e.content).slice(0, 40)}
                                </div>
                            ))}

                            {dayItems.reminders.length > 0 && (
                                <div className="space-y-1 mb-2">
                                    {dayItems.reminders.map((r: any) => (
                                        <div key={r.id} className="flex items-start gap-1.5 group">
                                            <input type="checkbox" checked={r.done} onChange={() => toggleReminder(r.id)}
                                                className="mt-0.5 w-3 h-3 shrink-0 cursor-pointer" />
                                            <span className={`text-[10px] flex-1 ${r.done ? 'line-through text-gray-600' : 'text-gray-300'}`}>
                                                {r.text}
                                            </span>
                                            <button onClick={() => removeReminder(r.id)}
                                                className="text-gray-600 hover:text-red-400 text-[10px] opacity-0 group-hover:opacity-100">✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-1 mt-2">
                                <input
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addReminder()}
                                    placeholder="Напоминание…"
                                    className="flex-1 min-w-0 bg-black/20 border border-[var(--border)] rounded px-1.5 py-1 text-[10px] text-white outline-none focus:border-cyan-400"
                                />
                                <button onClick={addReminder}
                                    className="px-2 rounded bg-cyan-400/20 text-cyan-400 text-[11px] shrink-0">+</button>
                            </div>

                            {!dayItems.log && !dayItems.workouts.length && !dayItems.diary.length && !dayItems.reminders.length && (
                                <div className="text-[10px] text-gray-600 mt-2">В этот день ничего не отмечено.</div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
