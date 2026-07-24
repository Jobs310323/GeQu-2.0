import { useState } from 'react';
import { TestChart, BigChart } from '../features/charts';

export function Dynamics({ logs, testResults, gymData }: any) {
    const [testType, setTestType] = useState('schulte');
    const testTypes = [
        { id: 'schulte', label: 'Шульте (время, сек)' },
        { id: 'stroop', label: 'Струп (очки)' },
        { id: 'reaction', label: 'Реакция (мс)' },
        { id: 'tmt', label: 'Соединения (время, сек)' },
        { id: 'digitspan', label: 'Память на числа (уровень)' },
        { id: 'gonogo', label: 'Go/No-Go (очки)' }
    ];

    // Логика Корреляций
    const insights: any[] = [];
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

    // 1. Сон -> Фокус
    const sleepHigh = logs.filter((l: any) => l.sleep >= 7).map((l: any) => l.focus);
    const sleepLow = logs.filter((l: any) => l.sleep <= 4).map((l: any) => l.focus);
    if (sleepHigh.length > 0 && sleepLow.length > 0) {
        const diff = (avg(sleepHigh) - avg(sleepLow)).toFixed(1);
        insights.push({
            title: "Сон → Фокус",
            text: `Когда сон ≥ 7/10, фокус в среднем ${avg(sleepHigh).toFixed(1)}. Когда сон ≤ 4/10, фокус ${avg(sleepLow).toFixed(1)}.`,
            diff: `Разница: +${diff} балла!`,
            verdict: "Ложись раньше, чтобы сохранить фокус."
        });
    }

    // 2. Тренировки -> Реакция
    const gymDates = new Set(gymData.history.map((w: any) => w.date.split('T')[0]));
    const reactionGym = testResults.filter((t: any) => t.type === 'reaction' && gymDates.has(t.date.split('T')[0])).map((t: any) => t.value);
    const reactionNoGym = testResults.filter((t: any) => t.type === 'reaction' && !gymDates.has(t.date.split('T')[0])).map((t: any) => t.value);
    if (reactionGym.length > 0 && reactionNoGym.length > 0) {
        // Для реакции меньше = лучше
        const diff = (avg(reactionNoGym) - avg(reactionGym)).toFixed(0);
        insights.push({
            title: "Тренировки → Реакция",
            text: `В дни с тренировкой скорость реакции: ${avg(reactionGym).toFixed(0)} мс. В дни без: ${avg(reactionNoGym).toFixed(0)} мс.`,
            diff: `Разница: ${diff} мс!`,
            verdict: "Тренировки улучшают когнитивные функции."
        });
    }

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Аналитика и динамика</h1>
            
            {/* Блок Корреляций */}
            {insights.length > 0 && (
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-4">🔍 Инсайты и Корреляции</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {insights.map((ins, i) => (
                            <div key={i} className="glass-card p-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/5">
                                <h3 className="text-xl font-bold text-cyan-400 mb-2">{ins.title}</h3>
                                <p className="text-sm text-gray-300 mb-2">{ins.text}</p>
                                <p className="text-sm text-white font-bold mb-3">{ins.diff}</p>
                                <div className="flex items-start gap-2 pt-3 border-t border-[var(--border)]">
                                    <span className="text-cyan-400">🎯</span>
                                    <p className="text-sm text-gray-400">{ins.verdict}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">Состояние (Сон, Фокус, Настроение)</h2>
                <div style={{ height: '300px' }}><BigChart logs={logs.slice(-10)} /></div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl">Динамика тренировок</h2>
                    <select value={testType} onChange={e => setTestType(e.target.value)} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400 text-white">
                        {testTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                </div>
                <div style={{ height: '300px' }}>
                    <TestChart results={testResults.filter((r:any) => r.type === testType)} />
                </div>
            </div>
        </div>
    );
}
