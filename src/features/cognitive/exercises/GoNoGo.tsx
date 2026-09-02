// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';

export function GoNoGoTest({ setTestResults }: ExerciseProps) {
    const { t } = useTranslation('brain');
    const [phase, setPhase] = useState<'idle' | 'playing' | 'gameover'>('idle');
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [stimulus, setStimulus] = useState<'none' | 'go' | 'nogo' | 'error'>('none');
    const scoreRef = useRef(0);
    const stimulusRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Keep a ref of the score so the countdown effect can read the final value
    // without depending on `score` (which would tear down the stimulus loop).
    useEffect(() => { scoreRef.current = score; }, [score]);

    const nextStimulus = () => {
        setStimulus('none');
        const delay = Math.random() * 1000 + 800;
        stimulusRef.current = setTimeout(() => {
            const type = Math.random() < 0.72 ? 'go' : 'nogo';
            setStimulus(type);
            stimulusRef.current = setTimeout(() => {
                if (type === 'go') setScore(s => s - 1); // missed a green one
                nextStimulus();
            }, 1100);
        }, delay);
    };

    const startGame = () => {
        setScore(0);
        setTime(30);
        setStimulus('none');
        setPhase('playing');
    };

    const handleClick = () => {
        if (phase !== 'playing') return;
        if (stimulus === 'go') {
            setScore(s => s + 1);
            clearTimeout(stimulusRef.current);
            nextStimulus();
        } else if (stimulus === 'nogo') {
            setScore(s => s - 2); // pressed on red
            setStimulus('error');
            clearTimeout(stimulusRef.current);
            setTimeout(() => nextStimulus(), 500);
        }
    };

    // Stimulus loop — keyed on phase only, so score changes (and StrictMode's
    // double-invoke) can't cancel the pending circle.
    useEffect(() => {
        if (phase !== 'playing') return;
        nextStimulus();
        return () => clearTimeout(stimulusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Countdown — keyed on phase only. The updater stays pure (just decrements);
    // ending the game is handled by the separate effect below.
    useEffect(() => {
        if (phase !== 'playing') return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    // Game over when the clock hits zero (no state updates inside an updater).
    useEffect(() => {
        if (phase === 'playing' && time <= 0) {
            clearTimeout(stimulusRef.current);
            setStimulus('none');
            recordAttempt(setTestResults, 'gonogo', scoreRef.current);
            setPhase('gameover');
        }
    }, [time, phase, setTestResults]);

    const circleClass = stimulus === 'go' ? 'bg-green-500 shadow-lg shadow-green-500/40' :
                        stimulus === 'nogo' ? 'bg-red-500 shadow-lg shadow-red-500/40' :
                        stimulus === 'error' ? 'bg-red-700 border-4 border-red-300' : '';

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">
                <Trans
                    i18nKey="brain:ex.goNoGo.blurb"
                    components={[
                        <span key="0" />,
                        <span key="1" className="text-green-400 font-bold" />,
                        <span key="2" />,
                        <span key="3" className="text-red-400 font-bold" />,
                    ]}
                />
            </p>

            {phase === 'playing' && (
                <div className="flex gap-8 mb-8 text-2xl">
                    <div>{t('brain:ex.common.score')}<span className="text-cyan-400 font-bold">{score}</span></div>
                    <div>{t('brain:ex.common.time')}<span className="text-pink-400 font-bold">{time}s</span></div>
                </div>
            )}

            <button type="button" onClick={handleClick}
                aria-label={t('brain:ex.goNoGo.field')}
                className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] transition-colors duration-150 ${phase === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}>
                {phase === 'idle' && <span className="text-3xl font-bold text-white">{t('brain:ex.goNoGo.pressStart')}</span>}
                {phase === 'gameover' && (
                    <div className="text-center">
                        <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                        <div className="text-xl text-gray-300">{t('brain:ex.common.yourResult')}</div>
                    </div>
                )}
                {phase === 'playing' && (stimulus === 'go' || stimulus === 'nogo' || stimulus === 'error') && (
                    <div key={stimulus + time} style={{ animation: 'popIn 0.15s ease-out' }}
                        className={`w-40 h-40 rounded-full flex items-center justify-center ${circleClass}`}>
                        {stimulus === 'error' && <span className="text-3xl font-bold text-white">{t('brain:ex.goNoGo.oops')}</span>}
                    </div>
                )}
            </button>

            {phase === 'idle' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{t('brain:ex.pomodoro.start')}</button>}
            {phase === 'gameover' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{t('brain:ex.common.playAgain')}</button>}
        </div>
    );
}

/**
 * The countdown itself is driven by PomodoroTicker in the app shell, so it keeps
 * running when this tab unmounts — this component is just the dial and controls.
 */
