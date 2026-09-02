import { useTranslation } from 'react-i18next';
import { PageHeader } from '../components/PageHeader';
import { RadialGauge } from '../components/RadialGauge';
import { BentoCard } from '../components/BentoCard';
import type { UnifiedStatsProps } from '../types/props';

/** The three self-rated numbers a day log carries. */
type DayMetric = 'sleep' | 'focus' | 'mood';

/** The three day metrics shown as gauges, in fixed order. */
const GAUGE_KEYS: { key: DayMetric; labelKey: string; textClass: string }[] = [
    { key: 'sleep', labelKey: 'plan:stats.gauge.sleep', textClass: 'text-purple-400' },
    { key: 'focus', labelKey: 'plan:stats.gauge.focus', textClass: 'text-cyan-400' },
    { key: 'mood', labelKey: 'plan:stats.gauge.mood', textClass: 'text-green-400' },
];

export function UnifiedStats({ logs, testResults, gymData }: UnifiedStatsProps) {
    const { t } = useTranslation('plan');
    const last7Logs = logs.slice(-7);
    // Only average entries that actually carry a finite number — older logs may
    // predate a field (e.g. mood), which otherwise poisoned the sum into NaN.
    const avg = (key: DayMetric) => {
        const nums = last7Logs.map(l => Number(l[key])).filter(n => Number.isFinite(n));
        return nums.length ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : '—';
    };

    const totalTonnage = gymData.history.reduce((acc: number, w) => {
        return acc + w.exercises.reduce((exAcc: number, ex) =>
            exAcc + ex.sets.reduce((sAcc: number, s) => s.done ? sAcc + (s.weight ?? 0) * (s.reps ?? 0) : sAcc, 0), 0);
    }, 0);

    const testCounts: Record<string, number> = {};
    testResults.forEach((t) => { testCounts[t.type] = (testCounts[t.type] || 0) + 1; });
    const uniqueExercises = new Set();
    gymData.history.forEach((w) => w.exercises.forEach((e) => uniqueExercises.add(e.name)));

    const gaugeValue = (key: DayMetric) => {
        const raw = avg(key);
        return raw === '—' ? null : Number(raw);
    };

    return (
        <div>
            <PageHeader page="hub" title={t('plan:stats.title')} subtitle={t('plan:stats.subtitle')} />

            <div className="glass-card p-6 rounded-2xl mb-6 bg-cyan-400/5 border border-cyan-400/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {GAUGE_KEYS.map(g => {
                        const value = gaugeValue(g.key);
                        return (
                            <div key={g.key} className={`flex flex-col items-center justify-center ${g.textClass}`}>
                                {value === null
                                    ? <div className="text-sm text-gray-500 py-6">{t('plan:stats.noData')}</div>
                                    : <RadialGauge value={value} max={10} label={t(g.labelKey)} color="currentColor" />}
                            </div>
                        );
                    })}
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-pink-400 tabular-nums">{Math.round(totalTonnage)}</div>
                        <div className="text-xs text-gray-400 mt-1">{t('plan:stats.tonnageLabel')}</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BentoCard title={t('plan:stats.cognitiveTitle')} icon="flask">
                    {Object.keys(testCounts).length === 0 ? <p className="text-gray-400">{t('plan:stats.noData')}</p> : (
                        <div className="space-y-3">
                            {Object.entries(testCounts).map(([type, count]) => (
                                <div key={type} className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                                    <span className="capitalize text-gray-300">{type}</span>
                                    <span className="text-cyan-400 font-bold">{t('plan:stats.times', { count })}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </BentoCard>

                <BentoCard title={t('plan:stats.gymTitle')} icon="dumbbell">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">{t('plan:stats.totalWorkouts')}</span>
                            <span className="text-cyan-400 font-bold">{gymData.history.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">{t('plan:stats.uniqueExercises')}</span>
                            <span className="text-cyan-400 font-bold">{uniqueExercises.size}</span>
                        </div>
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
