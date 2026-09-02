import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { callAIJson, hasGroqKey } from '../lib/ai';
import { DB } from '../lib/db';
import type { WeekSummaryProps } from '../types/props';
import { errorMessage } from '../lib/helpers';

/** What gets written to `gequ_weekSummary`: the generated summary plus when it was made. */
type CachedSummary = {
    summary: Summary;
    /** Human-readable stamp shown in the UI. */
    madeAt?: string;
    /** Epoch ms, used to decide the summary has gone stale. */
    at?: number;
};

type Summary = {
    headline?: string;
    went_well?: string[];
    got_in_the_way?: string[];
    next_week?: string[];
};

// The week-summary system prompt lives in the locale files — see ADR-006.

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = (n: number) => Number(n.toFixed(1));

/** Everything that happened inside a [from, to) window, as plain numbers. */
function windowStats(from: number, to: number, d: WeekSummaryProps) {
    const inRange = (iso: string) => {
        const t = new Date(iso).getTime();
        return t >= from && t < to;
    };
    const logs = (d.logs ?? []).filter(l => inRange(l.date));
    const num = (k: 'sleep' | 'focus' | 'mood') => logs.map(l => Number(l[k])).filter(n => Number.isFinite(n));
    const tags = (field: 'helped' | 'hindered') => {
        const c: Record<string, number> = {};
        logs.forEach(l => (l[field] ?? []).forEach(t => { c[t] = (c[t] || 0) + 1; }));
        return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, n]) => ({ tag, n }));
    };
    return {
        daysClosed: logs.length,
        sleep: r1(avg(num('sleep'))),
        focus: r1(avg(num('focus'))),
        mood: r1(avg(num('mood'))),
        helped: tags('helped'),
        hindered: tags('hindered'),
        workouts: (d.gymData?.history ?? []).filter((w) => inRange(w.date)).length,
        tests: (d.testResults ?? []).filter((t) => inRange(t.date)).length,
        diaryEntries: (d.diary ?? []).filter((e) => inRange(e.date)).length,
        habitTicks: (d.habits ?? []).reduce((s: number, h) =>
            s + (h.history ?? []).filter((day: string) => {
                const t = new Date(day + 'T12:00:00').getTime();
                return t >= from && t < to;
            }).length, 0),
        tasksDone: (d.kanban ?? []).filter((t) => t.status === 'done').length,
    };
}

export function WeekSummary(props: WeekSummaryProps) {
    const { t } = useTranslation('insights');
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [madeAt, setMadeAt] = useState('');

    const now = Date.now();
    const week = 7 * 86400000;
    const thisWeek = windowStats(now - week, now, props);
    const lastWeek = windowStats(now - 2 * week, now - week, props);

    useEffect(() => {
        const cached = DB.get<CachedSummary | null>('weekSummary', null);
        // A summary older than a day is stale — the week it describes has moved.
        if (cached?.summary && now - (cached.at ?? 0) < 86400000) {
            setSummary(cached.summary);
            setMadeAt(cached.madeAt || '');
        }
    }, [now]);

    const delta = (a: number, b: number) => (b ? r1(a - b) : null);

    const generate = async () => {
        setLoading(true); setError('');
        try {
            const payload = {
                thisWeek,
                lastWeek,
                changes: {
                    sleep: delta(thisWeek.sleep, lastWeek.sleep),
                    focus: delta(thisWeek.focus, lastWeek.focus),
                    mood: delta(thisWeek.mood, lastWeek.mood),
                    daysClosed: thisWeek.daysClosed - lastWeek.daysClosed,
                },
            };
            const res = await callAIJson<Summary>({
                system: t('insights:week.system'),
                prompt: t('insights:week.prompt', { json: JSON.stringify(payload, null, 2) }),
                maxTokens: 900,
            });
            const stamp = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            setSummary(res); setMadeAt(stamp);
            DB.save('weekSummary', { summary: res, madeAt: stamp, at: Date.now() });
        } catch (e) {
            setError(errorMessage(e, t('insights:week.failed')));
        } finally {
            setLoading(false);
        }
    };

    const Tile = ({ label, value, change }: { label: string; value: number | string; change: number | null }) => (
        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
            <div className="text-xs text-gray-400 mb-0.5">{label}</div>
            <div className="text-xl font-bold text-white tabular-nums">{value || '—'}</div>
            {change !== null && change !== 0 && Number.isFinite(change) && (
                <div className={`text-[11px] tabular-nums ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {change > 0 ? '▲' : '▼'} {Math.abs(change)}
                </div>
            )}
        </div>
    );

    const List = ({ title, items, tone, icon }: { title: string; items?: string[] | undefined; tone: string; icon: string }) =>
        items?.length ? (
            <div>
                <div className={`text-sm font-bold mb-2 ${tone}`}>{icon} {title}</div>
                <ul className="space-y-1.5">
                    {items.map((item: string, i: number) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className={tone}>•</span><span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        ) : null;

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h2 className="text-xl font-bold">{t('insights:week.heading')}</h2>
                {madeAt && <span className="text-xs text-gray-500">{t('insights:week.madeAt', { when: madeAt })}</span>}
            </div>
            <p className="text-sm text-gray-400 mb-4">{t('insights:week.blurb')}</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Tile label={t('insights:week.daysClosed')} value={thisWeek.daysClosed} change={thisWeek.daysClosed - lastWeek.daysClosed} />
                <Tile label={t('insights:week.sleep')} value={thisWeek.sleep} change={delta(thisWeek.sleep, lastWeek.sleep)} />
                <Tile label={t('insights:week.focus')} value={thisWeek.focus} change={delta(thisWeek.focus, lastWeek.focus)} />
                <Tile label={t('insights:week.mood')} value={thisWeek.mood} change={delta(thisWeek.mood, lastWeek.mood)} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                <span>🏋️ {t('insights:week.workouts')}<b className="text-gray-300">{thisWeek.workouts}</b></span>
                <span>🎓 {t('insights:week.tests')}<b className="text-gray-300">{thisWeek.tests}</b></span>
                <span>♻️ {t('insights:week.habits')}<b className="text-gray-300">{thisWeek.habitTicks}</b></span>
                <span>📓 {t('insights:week.entries')}<b className="text-gray-300">{thisWeek.diaryEntries}</b></span>
            </div>

            <button onClick={generate} disabled={loading || !hasGroqKey()}
                title={!hasGroqKey() ? t('insights:week.needKey') : undefined}
                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2.5 rounded-lg disabled:opacity-40">
                {loading ? t('insights:week.building') : summary ? t('insights:week.rebuild') : t('insights:week.build')}
            </button>

            {error && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}

            {summary && (
                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-4 anim-fade-in">
                    {summary.headline && <p className="text-lg text-white">{summary.headline}</p>}
                    <List title={t('insights:week.wentWell')} items={summary.went_well} tone="text-green-400" icon="✅" />
                    <List title={t('insights:week.gotInTheWay')} items={summary.got_in_the_way} tone="text-yellow-400" icon="⚠️" />
                    <List title={t('insights:week.nextWeek')} items={summary.next_week} tone="text-cyan-400" icon="🎯" />
                </div>
            )}
        </div>
    );
}
