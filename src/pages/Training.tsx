import { useState } from 'react';
import { NBackTest, SchulteTable, BreathingExercise, StroopTest, ReactionTest, TrailMakingTest, DigitSpanTest, GoNoGoTest, PomodoroTimer } from '../features/training/tests';

export function Training({ setTestResults, achievements, setAchievements }: any) {
    const [tab, setTab] = useState('schulte');
    const tabs = [
        { id: 'schulte', label: 'Шульте' },
        { id: 'stroop', label: 'Струп' },
        { id: 'reaction', label: 'Реакция' },
        { id: 'trail', label: 'Соединения' },
        { id: 'digitspan', label: 'Память на числа' },
        { id: 'gonogo', label: 'Go/No-Go' },
        { id: 'nback', label: 'N-Back' }, // <--- Добавили вкладку
        { id: 'breathing', label: 'Дыхание' },
        { id: 'pomodoro', label: 'Pomodoro' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Тренировки</h1>
            <div className="flex gap-2 mb-6 flex-wrap">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} 
                        className={`px-4 py-2 rounded-lg transition ${tab === t.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>
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
            {tab === 'breathing' && <BreathingExercise />}
            {tab === 'pomodoro' && <PomodoroTimer />}
        </div>
    );
}
