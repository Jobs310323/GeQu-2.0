// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect } from 'react';
import { recordAttempt } from '../record';
import { Icon } from '../../../components/Icons';
import type { ExerciseProps } from '../../../types/props';

export function NBackTest({ setTestResults }: ExerciseProps) {
    const [phase, setPhase] = useState<'config' | 'playing' | 'finished'>('config');
    const [nLevel, setNLevel] = useState(2);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [sequence, setSequence] = useState<number[]>([]);
    const [answers, setAnswers] = useState<boolean[]>([]);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    
    const totalTrials = 20;

    const startTest = (n: number) => {
        const seq: number[] = [];
        for (let i = 0; i < totalTrials; i++) {
            const lookback = i >= n ? seq[i - n] : undefined;
            if (lookback !== undefined && Math.random() < 0.3) {
                seq.push(lookback);
            } else {
                let next = Math.floor(Math.random() * 9);
                if (i >= n && next === seq[i - n]) {
                    next = (next + 1) % 9;
                }
                seq.push(next);
            }
        }
        setSequence(seq);
        setNLevel(n);
        setAnswers([]);
        setCurrentIdx(0);
        setHasAnswered(false);
        setPhase('playing');
    };

    // Игровой цикл
    useEffect(() => {
        if (phase !== 'playing') return;
        
        if (currentIdx >= totalTrials) {
            // Only credit trials the user actually judged: a hit is a match they
            // caught, a false alarm is pressing on a non-match. Silently letting
            // non-match trials pass by is not an answer, so it earns nothing —
            // otherwise doing nothing at all would still score close to 100%.
            let matches = 0, hits = 0, falseAlarms = 0;
            for (let i = 0; i < totalTrials; i++) {
                const isMatch = i >= nLevel && sequence[i] === sequence[i - nLevel];
                const userSaidMatch = answers[i] || false;
                if (isMatch) {
                    matches++;
                    if (userSaidMatch) hits++;
                } else if (userSaidMatch) {
                    falseAlarms++;
                }
            }
            const accuracy = matches > 0 ? Math.max(0, ((hits - falseAlarms) / matches) * 100) : 0;

            setFinalAccuracy(accuracy);
            recordAttempt(setTestResults, 'nback', accuracy); // Твоя функция сохранения
            setPhase('finished');
            return;
        }

        setActiveCell(sequence[currentIdx] ?? null);
        setHasAnswered(false);
        
        const showTimer = setTimeout(() => setActiveCell(null), 800);
        const nextTimer = setTimeout(() => setCurrentIdx(prev => prev + 1), 1500);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(nextTimer);
        };
    }, [phase, currentIdx, sequence, nLevel, answers, setTestResults]);

    const handleMatch = () => {
        if (phase !== 'playing' || hasAnswered) return;
        setHasAnswered(true);
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIdx] = true;
            return newAnswers;
        });
    };

    // Пробел для ответа
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' && phase === 'playing') {
                e.preventDefault();
                handleMatch();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [phase, hasAnswered, currentIdx]);

    if (phase === 'finished') {
        return (
            <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
                <h3 className="text-2xl font-bold text-white mb-4">Тест завершен!</h3>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                    {finalAccuracy.toFixed(1)}%
                </p>
                <p className="text-gray-400 mb-6 text-center">Точность рабочей памяти. Результат сохранен.</p>
                <button onClick={() => setPhase('config')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Пройти еще раз
                </button>
            </div>
        );
    }

    if (phase === 'playing') {
        return (
            <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
                <div className="w-full max-w-md flex justify-between items-center mb-6">
                    <span className="text-gray-400 text-sm">Уровень: <span className="text-white font-bold">{nLevel}-Back</span></span>
                    <span className="text-gray-400 text-sm">Прогресс: <span className="text-white font-bold">{currentIdx} / {totalTrials}</span></span>
                </div>
                
                {/* Сетка 3x3 */}
                <div className="grid grid-cols-3 gap-3 w-64 h-64 mb-8">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`rounded-xl border border-[var(--border)] transition-all duration-150 ${activeCell === i ? 'bg-cyan-400 scale-95 shadow-lg shadow-cyan-400/50' : 'bg-[var(--bg-input)]'}`}></div>
                    ))}
                </div>

                <button
                    onClick={handleMatch}
                    className={`w-full max-w-md px-8 py-4 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2 ${hasAnswered ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-95' : 'bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20'}`}
                >
                    {hasAnswered ? <><Icon name="check" size={16} /> Отмечено</> : 'Совпадение! (или Space)'}
                </button>
            </div>
        );
    }

    // Экран настроек (phase === 'config')
    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <h3 className="text-2xl font-bold text-white mb-4">N-Back Тренировка</h3>
            <p className="text-gray-400 mb-6 text-center max-w-md text-sm">
                На экране будут появляться квадраты. Нажимайте кнопку, если квадрат появился в той же позиции, что и <span className="text-cyan-400 font-bold">N шагов назад</span>.
            </p>
            
            <div className="flex gap-3 mb-8">
                {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setNLevel(n)}
                        className={`w-16 h-16 rounded-xl border font-bold transition ${nLevel === n ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border)] hover:text-white'}`}>
                        {n}-Back
                    </button>
                ))}
            </div>

            <button onClick={() => startTest(nLevel)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                Начать тест
            </button>
        </div>
    );
}
