import { Icon } from '../../components/Icons';
import { averageBySphere, currentStreak, forecastTomorrow, mostHarmoniousDay } from './logic';
import { SPHERES, type DayRecord } from './types';

function SphereRow({ label, avg }: { label: React.ReactNode; avg: Record<string, number> }) {
    return (
        <div className="grid grid-cols-4 gap-2 items-center text-sm py-1.5">
            <span className="text-[var(--text-muted)]">{label}</span>
            {SPHERES.map(s => (
                <span key={s.id} className="text-center font-bold tabular-nums" style={{ color: s.color }}>{avg[s.id]}</span>
            ))}
        </div>
    );
}

export function SnowmanAnalytics({ days }: { days: DayRecord[] }) {
    if (days.length === 0) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center text-[var(--text-muted)] text-sm">
                Пока нет данных Снеговика — заполни хотя бы пару дней в разделе «Снеговик».
            </div>
        );
    }

    const weekAvg = averageBySphere(days, 7);
    const monthAvg = averageBySphere(days, 30);
    const best = mostHarmoniousDay(days);
    const streak = currentStreak(days);
    const forecast = forecastTomorrow(days);

    return (
        <div className="space-y-5">
            <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
                    <Icon name="chart" size={17} className="text-cyan-400" /> Средний балл по сферам
                </h3>
                <div className="grid grid-cols-4 gap-2 text-xs text-[var(--text-muted)] mb-1 pb-2 border-b border-[var(--border)]">
                    <span />
                    {SPHERES.map(s => <span key={s.id} className="text-center" style={{ color: s.color }}>{s.icon}</span>)}
                </div>
                <SphereRow label="За неделю" avg={weekAvg} />
                <SphereRow label="За месяц" avg={monthAvg} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Самый гармоничный день</div>
                    {best ? (
                        <>
                            <div className="text-2xl font-bold text-[var(--text-main)]">{best.totalHarmony}%</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                {new Date(best.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </>
                    ) : <div className="text-sm text-[var(--text-muted)]">—</div>}
                </div>
                <div className="glass-card p-5 rounded-2xl border border-pink-400/25 bg-pink-400/5">
                    <div className="text-xs text-[var(--text-muted)] mb-1">Серия баланса</div>
                    <div className="text-2xl font-bold text-pink-400">{streak} дн.</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">подряд все сферы ≥ 8</div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-purple-400/30 bg-purple-400/5">
                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                    <Icon name="sparkle" size={16} /> Прогноз на завтра
                </h3>
                {forecast ? (
                    <>
                        <p className="text-sm text-gray-300 mb-1">
                            По скользящему среднему за 7 дней просядет: <b style={{ color: SPHERES.find(s => s.id === forecast.sphere)?.color }}>{forecast.sphereLabel}</b> (среднее {forecast.avg}/10).
                        </p>
                        <p className="text-sm text-purple-300">{forecast.recommendation}</p>
                    </>
                ) : (
                    <p className="text-sm text-gray-400">Пока недостаточно данных для прогноза — или всё сбалансировано. Так держать.</p>
                )}
            </div>
        </div>
    );
}
