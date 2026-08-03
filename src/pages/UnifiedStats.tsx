import { PageHeader } from '../components/PageHeader';
import { RadialGauge } from '../components/RadialGauge';
import { BentoCard } from '../components/BentoCard';

export function UnifiedStats({ logs, testResults, gymData }: any) {
    const last7Logs = logs.slice(-7);
    // Only average entries that actually carry a finite number — older logs may
    // predate a field (e.g. mood), which otherwise poisoned the sum into NaN.
    const avg = (key: string) => {
        const nums = last7Logs.map((l: any) => Number(l[key])).filter((n: number) => Number.isFinite(n));
        return nums.length ? (nums.reduce((a: number, b: number) => a + b, 0) / nums.length).toFixed(1) : '—';
    };

    const totalTonnage = gymData.history.reduce((acc: number, w: any) => {
        return acc + w.exercises.reduce((exAcc: number, ex: any) => 
            exAcc + ex.sets.reduce((sAcc: number, s: any) => s.done ? sAcc + s.weight * s.reps : sAcc, 0), 0);
    }, 0);

    const testCounts: any = {};
    testResults.forEach((t: any) => { testCounts[t.type] = (testCounts[t.type] || 0) + 1; });
    const uniqueExercises = new Set();
    gymData.history.forEach((w: any) => w.exercises.forEach((e: any) => uniqueExercises.add(e.name)));

    const gaugeValue = (key: string) => {
        const raw = avg(key);
        return raw === '—' ? null : Number(raw);
    };

    return (
        <div>
            <PageHeader page="hub" title="Единый хаб статистики" subtitle="Общая картина за последние 7 дней" />

            <div className="glass-card p-6 rounded-2xl mb-6 bg-cyan-400/5 border border-cyan-400/20">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { key: 'sleep', label: 'Средний сон', textClass: 'text-purple-400' },
                        { key: 'focus', label: 'Средний фокус', textClass: 'text-cyan-400' },
                        { key: 'mood', label: 'Настроение', textClass: 'text-green-400' },
                    ].map(g => {
                        const value = gaugeValue(g.key);
                        return (
                            <div key={g.key} className={`flex flex-col items-center justify-center ${g.textClass}`}>
                                {value === null
                                    ? <div className="text-sm text-gray-500 py-6">Нет данных</div>
                                    : <RadialGauge value={value} max={10} label={g.label} color="currentColor" />}
                            </div>
                        );
                    })}
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center flex flex-col items-center justify-center">
                        <div className="text-3xl font-bold text-pink-400 tabular-nums">{Math.round(totalTonnage)}</div>
                        <div className="text-xs text-gray-400 mt-1">Тоннаж в зале (кг)</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <BentoCard title="Когнитивные тесты" icon="flask">
                    {Object.keys(testCounts).length === 0 ? <p className="text-gray-400">Нет данных</p> : (
                        <div className="space-y-3">
                            {Object.entries(testCounts).map(([type, count]: any) => (
                                <div key={type} className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                                    <span className="capitalize text-gray-300">{type}</span>
                                    <span className="text-cyan-400 font-bold">{count} раз</span>
                                </div>
                            ))}
                        </div>
                    )}
                </BentoCard>

                <BentoCard title="Спортзал" icon="dumbbell">
                    <div className="space-y-3">
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">Всего тренировок</span>
                            <span className="text-cyan-400 font-bold">{gymData.history.length}</span>
                        </div>
                        <div className="flex justify-between items-center bg-[var(--bg-input)] p-3 rounded-lg">
                            <span className="text-gray-300">Упражнений в базе</span>
                            <span className="text-cyan-400 font-bold">{uniqueExercises.size}</span>
                        </div>
                    </div>
                </BentoCard>
            </div>
        </div>
    );
}
