import { useState, useMemo } from 'react';
import { StateChart, TestChart, SERIES } from '../features/charts';
import { LOWER_IS_BETTER, TEST_LABELS } from '../lib/profile';
import { Icon } from '../components/Icons';
import type { DynamicsProps } from '../types/props';
import type { TestResult } from '../types/domain';

/** The three self-rated numbers a day log carries. */
type DayMetric = 'sleep' | 'focus' | 'mood';

/**
 * An observed association in the user's own data.
 *
 * `text` states what was measured over what window; it deliberately never says
 * one thing caused another. Phase 10 replaces this with the full insight
 * envelope (sample size, baseline, confidence).
 */
type Insight = {
    icon: string;
    title: string;
    /** What was measured, over what window. */
    text: string;
    /** The headline number, pre-formatted. */
    highlight: string;
    /** The takeaway. Association only — never a causal claim. */
    verdict: string;
};

const PERIODS = [
    { id: 7, label: '7 дней' },
    { id: 30, label: '30 дней' },
    { id: 90, label: '3 месяца' },
    { id: 0, label: 'Всё время' },
];

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const round = (n: number, d = 1) => Number(n.toFixed(d));
const finite = <T,>(arr: T[], key: keyof T) => arr.map(l => Number(l[key])).filter(n => Number.isFinite(n));

function within<T extends { date: string }>(items: T[], days: number) {
    if (!days) return items;
    const cutoff = Date.now() - days * 86400000;
    return items.filter(i => new Date(i.date).getTime() >= cutoff);
}

/** Headline number plus its change against the preceding, equal-length window. */
function MetricTile({ label, value, delta, color }: { label: string; value: number | string; delta: number | null; color: string }) {
    // NaN is the "no previous period to compare against" signal, so a delta is
    // only shown when it is both finite and a real movement.
    const hasDelta = delta !== null && Number.isFinite(delta) && delta !== 0;
    return (
        <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-xs text-gray-400">{label}</span>
            </div>
            <div className="text-3xl font-bold text-white tabular-nums">{value || '—'}</div>
            {hasDelta && (
                <div className={`flex items-center gap-1 text-xs mt-1 tabular-nums ${delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    <Icon name={delta > 0 ? 'trendUp' : 'trendDown'} size={12} />
                    {Math.abs(delta)} к прошлому периоду
                </div>
            )}
        </div>
    );
}

/** The three day metrics charted over the selected window, in fixed order. */
const TILES: { key: DayMetric; label: string; color: string }[] = [
    { key: 'sleep', label: 'Сон', color: SERIES[0] },
    { key: 'focus', label: 'Фокус', color: SERIES[1] },
    { key: 'mood', label: 'Настроение', color: SERIES[2] },
];

export function Dynamics({ logs, testResults, gymData }: DynamicsProps) {
    const [days, setDays] = useState(30);
    const [testType, setTestType] = useState<string | null>(null);

    const sortedLogs = useMemo(
        () => [...(logs ?? [])].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
        [logs]);

    const periodLogs = useMemo(() => within(sortedLogs, days), [sortedLogs, days]);

    // Preceding window of the same length, to give each tile a delta.
    const prevLogs = useMemo(() => {
        if (!days) return [];
        const end = Date.now() - days * 86400000;
        const start = end - days * 86400000;
        return sortedLogs.filter(l => {
            const t = new Date(l.date).getTime();
            return t >= start && t < end;
        });
    }, [sortedLogs, days]);

    const tiles = TILES.map(t => {
        const now = round(avg(finite(periodLogs, t.key)));
        const before = round(avg(finite(prevLogs, t.key)));
        return { ...t, value: now, delta: before ? round(now - before) : NaN };
    });

    // Only offer test types that actually have data in this window.
    const testsInPeriod = useMemo(() => {
        const scoped = within(testResults ?? [], days);
        const byType: Record<string, TestResult[]> = {};
        scoped.forEach((t) => { (byType[t.type] ||= []).push(t); });
        return Object.entries(byType)
            .map(([type, list]) => ({
                type,
                label: TEST_LABELS[type] ?? type,
                lowerIsBetter: LOWER_IS_BETTER.has(type),
                list: [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            }))
            .sort((a, b) => b.list.length - a.list.length);
    }, [testResults, days]);

    const activeTest = testsInPeriod.find(t => t.type === testType) ?? testsInPeriod[0] ?? null;

    const testStats = useMemo(() => {
        if (!activeTest) return null;
        const vals = activeTest.list.map(r => Number(r.value)).filter(n => Number.isFinite(n));
        if (!vals.length) return null;
        // Compare the first third with the last third so one outlier can't skew it.
        const chunk = Math.max(1, Math.floor(vals.length / 3));
        const early = avg(vals.slice(0, chunk));
        const late = avg(vals.slice(-chunk));
        const improvedPct = vals.length >= 3 && early > 0
            ? Math.round(((activeTest.lowerIsBetter ? early - late : late - early) / early) * 100)
            : null;
        return {
            best: round(activeTest.lowerIsBetter ? Math.min(...vals) : Math.max(...vals)),
            average: round(avg(vals)),
            improvedPct,
        };
    }, [activeTest]);

    const insights = useMemo(() => {
        const out: Insight[] = [];
        const scoped = periodLogs;

        const sleepHigh = scoped.filter(l => Number(l.sleep) >= 7).map(l => Number(l.focus)).filter(n => Number.isFinite(n));
        const sleepLow = scoped.filter(l => Number(l.sleep) <= 4).map(l => Number(l.focus)).filter(n => Number.isFinite(n));
        if (sleepHigh.length && sleepLow.length) {
            const d = round(avg(sleepHigh) - avg(sleepLow));
            out.push({
                icon: 'moon', title: 'Сон → Фокус',
                text: `При сне ≥ 7 фокус в среднем ${round(avg(sleepHigh))}, при сне ≤ 4 — ${round(avg(sleepLow))}.`,
                highlight: `Разница: ${d > 0 ? '+' : ''}${d} балла`,
                verdict: d > 0 ? 'Сон — самый управляемый рычаг для фокуса.' : 'Связь неочевидна — данных пока мало.',
            });
        }

        const gymDates = new Set((gymData?.history ?? []).map((w) => w.date.split('T')[0]));
        const withGym = scoped.filter(l => gymDates.has(l.date.split('T')[0])).map(l => Number(l.mood)).filter(n => Number.isFinite(n));
        const noGym = scoped.filter(l => !gymDates.has(l.date.split('T')[0])).map(l => Number(l.mood)).filter(n => Number.isFinite(n));
        if (withGym.length && noGym.length) {
            const d = round(avg(withGym) - avg(noGym));
            out.push({
                icon: 'dumbbell', title: 'Тренировки → Настроение',
                text: `В дни с тренировкой настроение ${round(avg(withGym))}, без неё — ${round(avg(noGym))}.`,
                highlight: `Разница: ${d > 0 ? '+' : ''}${d} балла`,
                verdict: d > 0 ? 'Зал заметно поднимает настроение.' : 'Пока без выигрыша — посмотри на восстановление.',
            });
        }

        // Which "hindered" tag costs the most focus versus the period average.
        const tagFocus: Record<string, number[]> = {};
        scoped.forEach(l => (l.hindered ?? []).forEach((tag: string) => {
            if (Number.isFinite(Number(l.focus))) (tagFocus[tag] ||= []).push(Number(l.focus));
        }));
        const overall = avg(finite(scoped, 'focus'));
        const worst = Object.entries(tagFocus)
            .filter(([, v]) => v.length >= 2)
            .map(([tag, v]) => ({ tag, drop: round(overall - avg(v)), n: v.length }))
            .sort((a, b) => b.drop - a.drop)[0];
        if (worst && worst.drop > 0.3) {
            out.push({
                icon: 'alertTriangle', title: 'Что дороже всего стоит',
                text: `В дни с тегом «${worst.tag}» (${worst.n} раз) фокус ниже среднего по периоду.`,
                highlight: `−${worst.drop} балла к фокусу`,
                verdict: `Убрать «${worst.tag}» — самый быстрый выигрыш.`,
            });
        }

        return out;
    }, [periodLogs, gymData]);

    return (
        <div>
            <div className="flex flex-wrap gap-1 w-fit bg-[var(--bg-input)] p-1 rounded-xl border border-[var(--border)] mb-6">
                {PERIODS.map(p => (
                    <button key={p.id} onClick={() => setDays(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition ${
                            days === p.id ? 'bg-cyan-400/15 text-cyan-400 font-bold' : 'text-gray-400 hover:text-white'
                        }`}>
                        {p.label}
                    </button>
                ))}
            </div>

            {periodLogs.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    За выбранный период нет записей. Закрой день на Дашборде или выбери период пошире.
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                        {tiles.map(({ key, ...tile }) => <MetricTile key={key} {...tile} />)}
                    </div>

                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-xl font-bold">Состояние по дням</h2>
                            <span className="text-xs text-gray-500">{periodLogs.length} записей</span>
                        </div>
                        <div style={{ height: 300 }}><StateChart logs={periodLogs} /></div>
                    </div>

                    {insights.length > 0 && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                                <Icon name="search" size={18} className="text-cyan-400" />
                                Закономерности
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {insights.map((ins, i) => (
                                    <div key={i} className="glass-card p-5 rounded-2xl border border-cyan-400/20">
                                        <h3 className="font-bold text-cyan-400 mb-2 flex items-center gap-2">
                                            <Icon name={ins.icon} size={16} />
                                            {ins.title}
                                        </h3>
                                        <p className="text-sm text-gray-300 mb-2">{ins.text}</p>
                                        <p className="text-sm text-white font-bold mb-3">{ins.highlight}</p>
                                        <p className="text-xs text-gray-400 pt-3 border-t border-[var(--border)]">{ins.verdict}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="glass-card p-6 rounded-2xl">
                        <h2 className="text-xl font-bold mb-4">Когнитивные тесты</h2>

                        {testsInPeriod.length === 0 ? (
                            <p className="text-gray-500 text-sm py-6 text-center">
                                За этот период тестов нет. Загляни в раздел «Тренажёры».
                            </p>
                        ) : (
                            <>
                                <div className="flex flex-wrap gap-2 mb-5">
                                    {testsInPeriod.map(t => (
                                        <button key={t.type} onClick={() => setTestType(t.type)}
                                            className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                                                activeTest?.type === t.type
                                                    ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/40'
                                                    : 'text-gray-400 border-[var(--border)] hover:text-white'
                                            }`}>
                                            {t.label} <span className="opacity-60">· {t.list.length}</span>
                                        </button>
                                    ))}
                                </div>

                                {testStats && (
                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                            <div className="text-xs text-gray-400">Лучший</div>
                                            <div className="text-xl font-bold text-white tabular-nums">{testStats.best}</div>
                                        </div>
                                        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                            <div className="text-xs text-gray-400">Средний</div>
                                            <div className="text-xl font-bold text-white tabular-nums">{testStats.average}</div>
                                        </div>
                                        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                            <div className="text-xs text-gray-400">Динамика</div>
                                            <div className={`text-xl font-bold tabular-nums ${
                                                testStats.improvedPct === null ? 'text-gray-500'
                                                    : testStats.improvedPct > 0 ? 'text-green-400'
                                                    : testStats.improvedPct < 0 ? 'text-red-400' : 'text-gray-400'
                                            }`}>
                                                {testStats.improvedPct === null ? '—'
                                                    : `${testStats.improvedPct > 0 ? '↑' : testStats.improvedPct < 0 ? '↓' : ''} ${Math.abs(testStats.improvedPct)}%`}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTest && (
                                    <>
                                        <div className="text-sm text-gray-400 mb-2">
                                            {activeTest.label}
                                            {activeTest.lowerIsBetter && <span className="text-xs text-gray-500"> · меньше — лучше</span>}
                                        </div>
                                        <div style={{ height: 280 }}>
                                            <TestChart results={activeTest.list} label={activeTest.label} lowerIsBetter={activeTest.lowerIsBetter} />
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
