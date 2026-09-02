// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { recordAttempt } from '../record';
import { randomOf, type NonEmptyArray } from '../../../lib/nonEmpty';
import type { ExerciseProps } from '../../../types/props';

export function StroopTest({ setTestResults }: ExerciseProps) {
    const { t } = useTranslation('brain');
    const colors: NonEmptyArray<{ name: string; hex: string }> = [
        { name: t('brain:ex.stroop.colour.red'), hex: '#FF5555' },
        { name: t('brain:ex.stroop.colour.green'), hex: '#50FA7B' },
        { name: t('brain:ex.stroop.colour.blue'), hex: '#8BE9FD' },
        { name: t('brain:ex.stroop.colour.yellow'), hex: '#F1FA8C' },
    ];
    const [word, setWord] = useState(colors[0]);
    const [color, setColor] = useState(colors[1] ?? colors[0]);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const startGame = () => { setScore(0); setTime(30); setIsPlaying(true); nextRound(); };
    const nextRound = () => {
        // The ink colour must differ from the word, or there is no interference
        // to measure — that difference is the whole task.
        const rndWord = randomOf(colors);
        let rndColor = randomOf(colors);
        while (rndColor.name === rndWord.name) rndColor = randomOf(colors);
        setWord(rndWord); setColor(rndColor);
    };

    const scoreRef = useRef(0);
    useEffect(() => { scoreRef.current = score; }, [score]);

    // Keyed on isPlaying only — depending on `score` here restarted the
    // interval on every click (a fresh answer resets `score`), which kept
    // clearing the running timer before it ever ticked down.
    useEffect(() => {
        if (!isPlaying) return;
        timerRef.current = setInterval(() => {
            setTime(t => (t <= 1 ? 0 : t - 1));
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying && time <= 0) {
            setIsPlaying(false);
            recordAttempt(setTestResults, 'stroop', scoreRef.current);
        }
    }, [time, isPlaying, setTestResults]);

    const handleAnswer = (selectedColorName: string) => {
        if (!isPlaying) return;
        if (selectedColorName === color.name) setScore(s => s + 1);
        else setScore(s => s - 1);
        nextRound();
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">{t('brain:ex.stroop.blurb')}</p>
            {!isPlaying && time === 30 && <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">{t('brain:ex.stroop.start')}</button>}
            
            {isPlaying && (
                <div>
                    <div className="flex gap-8 mb-8 text-2xl">
                        <div>{t('brain:ex.common.score')}<span className="text-cyan-400 font-bold">{score}</span></div>
                        <div>{t('brain:ex.common.time')}<span className="text-pink-400 font-bold">{time}s</span></div>
                    </div>
                    <div className="text-7xl font-extrabold mb-10 text-center" style={{ color: color.hex }}>{word.name}</div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {colors.map(c => (
                            <button key={c.name} onClick={() => handleAnswer(c.name)} className="px-6 py-3 rounded-xl border border-[var(--border)] hover:bg-white/10 text-lg">{c.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {!isPlaying && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-4">{score}</div>
                    <div className="text-xl text-gray-300 mb-6">{t('brain:ex.common.yourResult')}</div>
                    <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{t('brain:ex.common.playAgain')}</button>
                </div>
            )}
        </div>
    );
}
