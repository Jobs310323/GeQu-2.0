// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';

export function DigitSpanTest({ setTestResults }: ExerciseProps) {
    const { t } = useTranslation('brain');
    const [level, setLevel] = useState(3);
    const [phase, setPhase] = useState('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [input, setInput] = useState('');
    const [currentIdx, setCurrentIdx] = useState(-1);
    const [message, setMessage] = useState(() => t('brain:ex.digitSpan.pressStart'));
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    const startLevel = (lvl: number) => {
        const seq = Array.from({ length: lvl }, () => Math.floor(Math.random() * 10));
        setSequence(seq);
        setInput('');
        setPhase('showing');
        setMessage(t('brain:ex.digitSpan.memorise'));
        
        let idx = 0;
        const showNext = () => {
            setCurrentIdx(idx);
            idx++;
            if (idx < seq.length) {
                timerRef.current = setTimeout(showNext, 800);
            } else {
                timerRef.current = setTimeout(() => {
                    setPhase('input');
                    setMessage(t('brain:ex.digitSpan.enterSequence'));
                    setCurrentIdx(-1);
                }, 800);
            }
        };
        timerRef.current = setTimeout(showNext, 1000);
    };

    const checkAnswer = () => {
        const correct = sequence.join('');
        if (input === correct) {
            setMessage(t('brain:ex.digitSpan.correct', { level: level + 1 }));
            setPhase('result');
            recordAttempt(setTestResults, 'digitspan', level);
            setLevel(l => l + 1);
        } else {
            setMessage(t('brain:ex.digitSpan.wrong', { correct }));
            setPhase('result');
            if(level > 3) recordAttempt(setTestResults, 'digitspan', level - 1);
            setLevel(3);
        }
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">{t('brain:ex.digitSpan.blurb')}</p>
            <div className="text-xl text-cyan-400 mb-6">{t('brain:ex.digitSpan.level', { level })}</div>
            
            <div className="w-full max-w-md h-32 flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] mb-8">
                {phase === 'showing' && currentIdx >= 0 ? (
                    <span className="text-7xl font-bold text-white">{sequence[currentIdx]}</span>
                ) : (
                    <span className="text-xl text-gray-400">{message}</span>
                )}
            </div>

            {phase === 'input' && (
                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-2xl outline-none focus:border-cyan-400 text-white tracking-widest"
                        autoFocus
                    />
                    <button onClick={checkAnswer} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg w-full">{t('brain:ex.digitSpan.check')}</button>
                </div>
            )}

            {(phase === 'idle' || phase === 'result') && (
                <button onClick={() => startLevel(level)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    {phase === 'idle' ? t('brain:ex.common.start') : t('brain:ex.digitSpan.continue')}
                </button>
            )}
        </div>
    );
}
