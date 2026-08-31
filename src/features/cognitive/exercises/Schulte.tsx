// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { recordAttempt } from '../record';
import type { ScoredExerciseProps } from '../../../types/props';
import type { GridCell } from './types';

export function SchulteTable({ setTestResults, achievements, setAchievements }: ScoredExerciseProps) {
    const [grid, setGrid] = useState<GridCell[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [toast, setToast] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const initSchulte = () => {
        const nums = Array.from({length: 25}, (_, i) => i + 1);
        // Fisher-Yates. Both indices are in range by construction, but the
        // compiler cannot see that, so read them out before swapping.
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const a = nums[i], b = nums[j];
            if (a === undefined || b === undefined) continue;
            nums[i] = b; nums[j] = a;
        }
        setGrid(nums.map(n => ({ value: n, status: 'pending' })));
        setNextNum(1); setTime(0); setIsRunning(true); setIsStopped(false);
    };
    const stopSchulte = () => { setIsRunning(false); setIsStopped(true); setNextNum(26); };

    useEffect(() => {
        if (isRunning) timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const addAchievement = (name: string) => {
        if (!achievements.includes(name)) { setAchievements(prev => [...prev, name]); setToast(prev => prev + ` Получена ачивка: "${name}"!`); }
    };

    const handleClick = (index: number, num: number) => {
        if (!isRunning || isStopped) return;
        if (num === nextNum) {
            setGrid(prev => prev.map((c, i) => (i === index ? { ...c, status: 'correct' } : c)));
            if (nextNum === 25) {
                setIsRunning(false); const finalTime = time / 1000;
                recordAttempt(setTestResults, 'schulte', finalTime);
                setToast(`Готово! Время: ${finalTime.toFixed(1)} сек.`);
                if (finalTime < 30) addAchievement("Молния (<30с)");
                else if (finalTime < 45) addAchievement("Снайпер (<45с)");
                else if (finalTime < 60) addAchievement("Стабильность (<60с)");
                setTimeout(() => setToast(''), 5000);
            } else setNextNum(n => n + 1);
        } else {
            setGrid(prev => prev.map((c, i) => (i === index ? { ...c, status: 'error' } : c)));
            setTimeout(() => setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c)), 300);
        }
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">Смотрите в центр. Находите числа по порядку.</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 w-full max-w-[400px] aspect-square mb-6">
                {grid.length === 0 && <div className="col-span-5 flex items-center justify-center text-gray-600">Нажмите "Начать"</div>}
                {grid.map((cell, i) => (
                    <button key={i} type="button"
                        onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        disabled={isStopped || cell.status !== 'pending'}
                        className={`flex items-center justify-center text-2xl font-bold cursor-pointer border rounded transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            isStopped ? 'bg-white/5 border-[var(--border)] text-gray-600 cursor-not-allowed' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>{cell.value}</button>
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={initSchulte} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{time === 0 ? 'Начать' : 'Начать заново'}</button>
                <button onClick={stopSchulte} disabled={!isRunning} className={`px-8 py-3 rounded-lg font-bold border transition ${isRunning ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-gray-700 text-gray-600 cursor-not-allowed'}`}>Стоп</button>
            </div>
            {toast && <div className="mt-6 bg-green-400/10 border border-green-400 text-green-400 px-6 py-3 rounded-lg text-sm">{toast}</div>}
        </div>
    );
}
