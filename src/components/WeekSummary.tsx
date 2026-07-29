import { useState, useEffect } from 'react';
import { callAIJson, hasGroqKey } from '../lib/ai';
import { DB } from '../lib/db';

type Summary = {
    headline?: string;
    went_well?: string[];
    got_in_the_way?: string[];
    next_week?: string[];
};

const SYSTEM = `Ты — внимательный собеседник в приложении GeQu. Пользователь — человек с СДВГ.

Тебе дают точную статистику за последние 7 дней: сколько дней закрыто, средние сон/фокус/настроение и как они изменились к прошлой неделе, отмеченные теги «помогло/мешало», привычки, закрытые задачи, тренировки, когнитивные тесты, записи дневника.

Важно про единицы: sleep, focus и mood — это САМООЦЕНКИ ПО ШКАЛЕ 0–10, а не часы, проценты или какие-либо другие величины. Пиши «сон 8 из 10» или «оценка сна выросла на 3 балла», но никогда не «3 часа». Не придумывай единиц измерения, которых нет.

Подведи итог недели: что получилось, что мешало, за что стоит зацепиться на следующей неделе. Опирайся только на цифры, которые дали. Если данных мало — скажи прямо, не выдумывай.

Не превращай отсутствие данных в упрёк: если тренировок или тестов не было, это факт для раздела «мешало» только если это действительно мешало, иначе просто не упоминай.

Обращайся на «ты», тепло и без нравоучений. Не хвали авансом — отмечай конкретное.

Отвечай СТРОГО одним JSON-объектом:
{"headline": "одна строка — какой была неделя", "went_well": ["что получилось, с опорой на цифру"], "got_in_the_way": ["что мешало, с опорой на цифру"], "next_week": ["одно конкретное выполнимое действие"]}

Массивы — по 2–3 пункта. Всё по-русски. Никакого текста вне JSON.`;

const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = (n: number) => Number(n.toFixed(1));

/** Everything that happened inside a [from, to) window, as plain numbers. */
function windowStats(from: number, to: number, d: any) {
    const inRange = (iso: string) => {
        const t = new Date(iso).getTime();
        return t >= from && t < to;
    };
    const logs = (d.logs ?? []).filter((l: any) => inRange(l.date));
    const num = (k: string) => logs.map((l: any) => Number(l[k])).filter((n: number) => Number.isFinite(n));
    const tags = (field: string) => {
        const c: Record<string, number> = {};
        logs.forEach((l: any) => (l[field] ?? []).forEach((t: string) => { c[t] = (c[t] || 0) + 1; }));
        return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tag, n]) => ({ tag, n }));
    };
    return {
        daysClosed: logs.length,
        sleep: r1(avg(num('sleep'))),
        focus: r1(avg(num('focus'))),
        mood: r1(avg(num('mood'))),
        helped: tags('helped'),
        hindered: tags('hindered'),
        workouts: (d.gymData?.history ?? []).filter((w: any) => inRange(w.date)).length,
        tests: (d.testResults ?? []).filter((t: any) => inRange(t.date)).length,
        diaryEntries: (d.diary ?? []).filter((e: any) => inRange(e.date)).length,
        habitTicks: (d.habits ?? []).reduce((s: number, h: any) =>
            s + (h.history ?? []).filter((day: string) => {
                const t = new Date(day + 'T12:00:00').getTime();
                return t >= from && t < to;
            }).length, 0),
        tasksDone: (d.kanban ?? []).filter((t: any) => t.status === 'done').length,
    };
}

export function WeekSummary(props: any) {
    const [summary, setSummary] = useState<Summary | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [madeAt, setMadeAt] = useState('');

    const now = Date.now();
    const week = 7 * 86400000;
    const thisWeek = windowStats(now - week, now, props);
    const lastWeek = windowStats(now - 2 * week, now - week, props);

    useEffect(() => {
        const cached = DB.get('weekSummary', null);
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
                system: SYSTEM,
                prompt: `Моя неделя в цифрах:\n\n${JSON.stringify(payload, null, 2)}\n\nПодведи итог.`,
                maxTokens: 900,
            });
            const stamp = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            setSummary(res); setMadeAt(stamp);
            DB.save('weekSummary', { summary: res, madeAt: stamp, at: Date.now() });
        } catch (e: any) {
            setError(e?.message || 'Не удалось подвести итог.');
        } finally {
            setLoading(false);
        }
    };

    const Tile = ({ label, value, change }: any) => (
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

    const List = ({ title, items, tone, icon }: any) =>
        items?.length ? (
            <div>
                <div className={`text-sm font-bold mb-2 ${tone}`}>{icon} {title}</div>
                <ul className="space-y-1.5">
                    {items.map((t: string, i: number) => (
                        <li key={i} className="text-sm text-gray-300 flex gap-2">
                            <span className={tone}>•</span><span>{t}</span>
                        </li>
                    ))}
                </ul>
            </div>
        ) : null;

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                <h2 className="text-xl font-bold">🗓️ Итог недели</h2>
                {madeAt && <span className="text-xs text-gray-500">составлено {madeAt}</span>}
            </div>
            <p className="text-sm text-gray-400 mb-4">Последние 7 дней в сравнении с предыдущими семью.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Tile label="Дней закрыто" value={thisWeek.daysClosed} change={thisWeek.daysClosed - lastWeek.daysClosed} />
                <Tile label="Сон" value={thisWeek.sleep} change={delta(thisWeek.sleep, lastWeek.sleep)} />
                <Tile label="Фокус" value={thisWeek.focus} change={delta(thisWeek.focus, lastWeek.focus)} />
                <Tile label="Настроение" value={thisWeek.mood} change={delta(thisWeek.mood, lastWeek.mood)} />
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-4">
                <span>🏋️ тренировок: <b className="text-gray-300">{thisWeek.workouts}</b></span>
                <span>🎓 тестов: <b className="text-gray-300">{thisWeek.tests}</b></span>
                <span>♻️ привычек: <b className="text-gray-300">{thisWeek.habitTicks}</b></span>
                <span>📓 записей: <b className="text-gray-300">{thisWeek.diaryEntries}</b></span>
            </div>

            <button onClick={generate} disabled={loading || !hasGroqKey()}
                title={!hasGroqKey() ? 'Нужен ключ Groq в Настройках' : undefined}
                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-5 py-2.5 rounded-lg disabled:opacity-40">
                {loading ? 'Свожу неделю…' : summary ? 'Пересобрать итог' : '✨ Подвести итог недели'}
            </button>

            {error && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}

            {summary && (
                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-4 anim-fade-in">
                    {summary.headline && <p className="text-lg text-white">{summary.headline}</p>}
                    <List title="Получилось" items={summary.went_well} tone="text-green-400" icon="✅" />
                    <List title="Мешало" items={summary.got_in_the_way} tone="text-yellow-400" icon="⚠️" />
                    <List title="На следующую неделю" items={summary.next_week} tone="text-cyan-400" icon="🎯" />
                </div>
            )}
        </div>
    );
}
