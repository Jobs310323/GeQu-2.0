import { useState } from 'react';
import { NBackTest, SchulteTable, CorsiTest, ArithmeticTest, SwitchingTest, BreathingExercise, StroopTest, ReactionTest, TrailMakingTest, DigitSpanTest, GoNoGoTest, PomodoroTimer } from '../features/training/tests';
import { PageHeader } from '../components/PageHeader';
import { LOWER_IS_BETTER } from '../lib/profile';

const TAB_TO_TYPE: Record<string, string> = {
    schulte: 'schulte', stroop: 'stroop', reaction: 'reaction', trail: 'tmt',
    digitspan: 'digitspan', gonogo: 'gonogo', nback: 'nback', corsi: 'corsi',
    arithmetic: 'arithmetic', switching: 'switching',
};

/** Last few attempts and the personal best for the exercise currently on screen. */
function RecentResults({ testResults, type }: any) {
    if (!type) return null;
    const list = (testResults ?? [])
        .filter((r: any) => r.type === type)
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (list.length === 0) return null;

    const lowerIsBetter = LOWER_IS_BETTER.has(type);
    const best = list.reduce((b: any, r: any) =>
        !b || (lowerIsBetter ? Number(r.value) < Number(b.value) : Number(r.value) > Number(b.value)) ? r : b, null);
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

    return (
        <div className="glass-card p-4 rounded-2xl mb-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <span className="text-sm font-medium text-[var(--text-muted)]">Недавние попытки</span>
                {best && (
                    <span className="text-xs text-cyan-400">
                        Лучший: <b className="tabular-nums">{best.value}</b> · {fmtDate(best.date)}
                    </span>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                {list.slice(0, 5).map((r: any) => (
                    <span key={r.id} className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-gray-300 tabular-nums">
                        {r.value} <span className="text-gray-500">· {fmtDate(r.date)}</span>
                    </span>
                ))}
            </div>
        </div>
    );
}

export function Training({ setTestResults, testResults, achievements, setAchievements, pomodoro, setPomodoro }: any) {
    const [tab, setTab] = useState('schulte');
    const tabs = [
        { id: 'schulte', label: 'Шульте' },
        { id: 'stroop', label: 'Струп' },
        { id: 'reaction', label: 'Реакция' },
        { id: 'trail', label: 'Соединения' },
        { id: 'digitspan', label: 'Память на числа' },
        { id: 'gonogo', label: 'Go/No-Go' },
        { id: 'nback', label: 'N-Back' },
        { id: 'corsi', label: 'Корси' },
        { id: 'arithmetic', label: 'Счёт' },
        { id: 'switching', label: 'Переключение' }, // <--- Добавили вкладку
        { id: 'breathing', label: 'Дыхание' },
        { id: 'pomodoro', label: 'Pomodoro' },
    ];

    return (
        <div>
            <PageHeader page="training" title="Тренажёры" subtitle="Когнитивные тренажёры и упражнения" />
            <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1 flex-wrap">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${tab === t.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
            <RecentResults testResults={testResults} type={TAB_TO_TYPE[tab]} />
            {tab === 'schulte' && <SchulteTable setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
            {tab === 'stroop' && <StroopTest setTestResults={setTestResults} />}
            {tab === 'reaction' && <ReactionTest setTestResults={setTestResults} achievements={achievements} setAchievements={setAchievements} />}
            {tab === 'trail' && <TrailMakingTest setTestResults={setTestResults} />}
            {tab === 'digitspan' && <DigitSpanTest setTestResults={setTestResults} />}
            {tab === 'gonogo' && <GoNoGoTest setTestResults={setTestResults} />}
            {tab === 'nback' && <NBackTest setTestResults={setTestResults} />} {/* <--- Добавили рендер */}
            {tab === 'corsi' && <CorsiTest setTestResults={setTestResults} />}
            {tab === 'arithmetic' && <ArithmeticTest setTestResults={setTestResults} />}
            {tab === 'switching' && <SwitchingTest setTestResults={setTestResults} />}
            {tab === 'breathing' && <BreathingExercise />}
            {tab === 'pomodoro' && <PomodoroTimer pomodoro={pomodoro} setPomodoro={setPomodoro} />}
        </div>
    );
}
