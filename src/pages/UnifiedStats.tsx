export function UnifiedStats({ logs, testResults, gymData }: any) {
    const last7Logs = logs.slice(-7);
    const avg = (key: string) => last7Logs.length ? (last7Logs.reduce((a: number, b: any) => a + b[key], 0) / last7Logs.length).toFixed(1) : '—';

    const totalTonnage = gymData.history.reduce((acc: number, w: any) => {
        return acc + w.exercises.reduce((exAcc: number, ex: any) => 
            exAcc + ex.sets.reduce((sAcc: number, s: any) => s.done ? sAcc + s.weight * s.reps : sAcc, 0), 0);
    }, 0);

    const testCounts: any = {};
    testResults.forEach((t: any) => { testCounts[t.type] = (testCounts[t.type] || 0) + 1; });
    const uniqueExercises = new Set();
    gymData.history.forEach((w: any) => w.exercises.forEach((e: any) => uniqueExercises.add(e.name)));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Единый хаб статистики</h1>
            <div className="glass-card p-6 rounded-2xl mb-6 bg-cyan-400/5 border border-cyan-400/20">
                <h2 className="text-xl font-bold text-cyan-400 mb-4">Общая картина (за последние 7 дней)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-purple-400">{avg('sleep')}</div>
                        <div className="text-xs text-gray-400 mt-1">Средний сон</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-cyan-400">{avg('focus')}</div>
                        <div className="text-xs text-gray-400 mt-1">Средний фокус</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-green-400">{avg('mood')}</div>
                        <div className="text-xs text-gray-400 mt-1">Настроение</div>
                    </div>
                    <div className="bg-[var(--bg-input)] p-4 rounded-xl text-center">
                        <div className="text-3xl font-bold text-pink-400">{Math.round(totalTonnage)}</div>
                        <div className="text-xs text-gray-400 mt-1">Тоннаж в зале (кг)</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">🧠 Когнитивные тесты</h3>
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
                </div>

                <div className="glass-card p-6 rounded-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">🏋️ Спортзал</h3>
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
                </div>
            </div>
        </div>
    );
}
