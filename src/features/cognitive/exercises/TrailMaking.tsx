// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '../../../lib/format';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';
import type { GridCell } from './types';

export function TrailMakingTest({ setTestResults }: ExerciseProps) {
    const { t } = useTranslation('brain');
    // The alternating sequence is the task itself, so it is per-locale: an
    // English speaker cannot run a trail-making test through Cyrillic letters.
    const targets = t('brain:ex.trail.targets', { returnObjects: true }) as unknown as string[];
    const [grid, setGrid] = useState<GridCell<string>[]>([]);
    const [nextIndex, setNextIndex] = useState(0);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const initGame = () => {
        const shuffled = [...targets].sort(() => Math.random() - 0.5);
        setGrid(shuffled.map(t => ({ value: t, status: 'pending' })));
        setNextIndex(0);
        setTime(0);
        setIsRunning(true);
        setIsFinished(false);
    };

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const handleClick = (index: number, value: string) => {
        if (!isRunning) return;
        const expectedValue = targets[nextIndex];
        
        if (value === expectedValue) {
            setGrid(prev => prev.map((c, i) => (i === index ? { ...c, status: 'correct' } : c)));
            
            if (nextIndex === targets.length - 1) {
                setIsRunning(false);
                setIsFinished(true);
                recordAttempt(setTestResults, 'tmt', time / 1000);
            } else {
                setNextIndex(prev => prev + 1);
            }
        } else {
            setGrid(prev => prev.map((c, i) => (i === index ? { ...c, status: 'error' } : c)));
            setTimeout(() => {
                setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c));
            }, 300);
        }
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4 text-center">{t('brain:ex.trail.blurb')}</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            
            {!isRunning && !isFinished && (
                <button onClick={initGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">{t('brain:ex.trail.start')}</button>
            )}
            
            {isFinished && (
                <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-green-400 mb-2">{t('brain:ex.trail.done')}</div>
                    <div className="text-xl text-gray-300">{t('brain:ex.trail.yourTime', { seconds: formatNumber(time / 1000, 1) })}</div>
                    <button onClick={initGame} className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">{t('brain:ex.trail.restart')}</button>
                </div>
            )}

            <div className="grid grid-cols-4 gap-3 w-full max-w-md">
                {grid.map((cell, i) => (
                    <button key={i} type="button"
                        onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        disabled={cell.status !== 'pending'}
                        className={`h-20 flex items-center justify-center text-2xl font-bold cursor-pointer border rounded-lg transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>
                        {cell.value}
                    </button>
                ))}
            </div>
        </div>
    );
}
