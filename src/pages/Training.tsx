import { useState } from 'react';
import { NBackTest, SchulteTable, CorsiTest, ArithmeticTest, SwitchingTest, BreathingExercise, StroopTest, ReactionTest, TrailMakingTest, DigitSpanTest, GoNoGoTest, PomodoroTimer } from '../features/training/tests';
import { PageHeader } from '../components/PageHeader';

export function Training({ setTestResults, achievements, setAchievements }: any) {
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
            <PageHeader page="training" title="Тренировки" subtitle="Когнитивные тренажёры и упражнения" />
            <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1 flex-wrap">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${tab === t.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}>
                        {t.label}
                    </button>
                ))}
            </div>
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
            {tab === 'pomodoro' && <PomodoroTimer />}
        </div>
    );
}
