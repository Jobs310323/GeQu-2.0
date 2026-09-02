import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { averageBySphere, currentStreak, forecastTomorrow, mostHarmoniousDay } from './logic';
import { SPHERES, sphereLabel, sphereRecommendation, type DayRecord } from './types';
import { formatDate } from '../../lib/format';

function SphereRow({ label, avg }: { label: React.ReactNode; avg: Record<string, number> }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center text-sm py-1.5">
            <span className="text-[var(--text-muted)]">{label}</span>
            {SPHERES.map(s => (
                <span key={s.id} className="text-center font-bold tabular-nums" style={{ color: s.color }}>{avg[s.id]}</span>
            ))}
        </div>
    );
}

export function SnowmanAnalytics({ days }: { days: DayRecord[] }) {
    const { t } = useTranslation('track');
    if (days.length === 0) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center text-[var(--text-muted)] text-sm">
                {t('track:snowman.analytics.empty')}
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
                    <Icon name="chart" size={17} className="text-cyan-400" /> {t('track:snowman.analytics.avgHeading')}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-[var(--text-muted)] mb-1 pb-2 border-b border-[var(--border)]">
                    <span />
                    {SPHERES.map(s => <span key={s.id} className="text-center" style={{ color: s.color }}>{s.icon}</span>)}
                </div>
                <SphereRow label={t('track:snowman.analytics.week')} avg={weekAvg} />
                <SphereRow label={t('track:snowman.analytics.month')} avg={monthAvg} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="glass-card p-5 rounded-2xl">
                    <div className="text-xs text-[var(--text-muted)] mb-1">{t('track:snowman.analytics.bestDayLabel')}</div>
                    {best ? (
                        <>
                            <div className="text-2xl font-bold text-[var(--text-main)]">{best.totalHarmony}%</div>
                            <div className="text-xs text-[var(--text-muted)] mt-1">
                                {formatDate(best.date, 'long')}
                            </div>
                        </>
                    ) : <div className="text-sm text-[var(--text-muted)]">{t('track:snowman.analytics.bestDayEmpty')}</div>}
                </div>
                <div className="glass-card p-5 rounded-2xl border border-pink-400/25 bg-pink-400/5">
                    <div className="text-xs text-[var(--text-muted)] mb-1">{t('track:snowman.analytics.streakLabel')}</div>
                    <div className="text-2xl font-bold text-pink-400">{t('track:snowman.analytics.streakDays', { count: streak })}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-1">{t('track:snowman.analytics.streakCaption')}</div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-purple-400/30 bg-purple-400/5">
                <h3 className="text-lg font-bold text-purple-400 mb-2 flex items-center gap-2">
                    <Icon name="sparkle" size={16} /> {t('track:snowman.analytics.forecastHeading')}
                </h3>
                {forecast ? (
                    <>
                        <p className="text-sm text-gray-300 mb-1">
                            {t('track:snowman.analytics.forecastPrefix')} <b style={{ color: SPHERES.find(s => s.id === forecast.sphere)?.color }}>{sphereLabel(forecast.sphere, t)}</b>{t('track:snowman.analytics.forecastSuffix', { avg: forecast.avg })}
                        </p>
                        <p className="text-sm text-purple-300">{sphereRecommendation(forecast.sphere, t)}</p>
                    </>
                ) : (
                    <p className="text-sm text-gray-400">{t('track:snowman.analytics.noForecast')}</p>
                )}
            </div>
        </div>
    );
}
