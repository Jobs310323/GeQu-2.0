// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';

export function SwitchingTest({ setTestResults }: ExerciseProps) {
    const { t } = useTranslation('brain');
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(45);
    const [score, setScore] = useState(0);
    const [rule, setRule] = useState<'parity' | 'colour'>('parity');
    const [card, setCard] = useState<{ n: number; warm: boolean } | null>(null);
    const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
    const scoreRef = useRef(0);

    useEffect(() => { scoreRef.current = score; }, [score]);

    const nextCard = () => {
        setCard({ n: 1 + Math.floor(Math.random() * 9), warm: Math.random() < 0.5 });
        // Flip the rule on roughly a third of trials — that is where the cost shows.
        if (Math.random() < 0.35) setRule(r => (r === 'parity' ? 'colour' : 'parity'));
    };

    const start = () => { setScore(0); setTime(45); setRule('parity'); setPlaying(true); nextCard(); };

    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [playing]);

    useEffect(() => {
        if (playing && time <= 0) {
            setPlaying(false);
            recordAttempt(setTestResults, 'switching', scoreRef.current);
        }
    }, [time, playing, setTestResults]);

    const answer = (yes: boolean) => {
        if (!playing || !card) return;
        const truth = rule === 'parity' ? card.n % 2 === 0 : card.warm;
        const correct = yes === truth;
        setScore(s => (correct ? s + 1 : Math.max(0, s - 1)));
        setFlash(correct ? 'ok' : 'bad');
        setTimeout(() => setFlash(null), 200);
        nextCard();
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">{t('brain:ex.switching.blurb')}</p>

            {!playing && time === 45 && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{t('brain:ex.switching.start')}</button>
            )}

            {playing && card && (
                <>
                    <div className="flex gap-8 mb-4 text-lg">
                        <span>{t('brain:ex.common.score')}<b className="text-cyan-400">{score}</b></span>
                        <span>{t('brain:ex.common.time')}<b className="text-pink-400">{time}s</b></span>
                    </div>

                    <div key={rule} style={{ animation: 'popIn 0.2s ease-out' }}
                        className="mb-6 px-5 py-2 rounded-xl bg-purple-400/15 border border-purple-400/40 text-purple-400 font-bold">
                        {rule === 'parity' ? t('brain:ex.switching.ruleParity') : t('brain:ex.switching.ruleColour')}
                    </div>

                    <div className={`w-40 h-40 rounded-2xl flex items-center justify-center text-7xl font-extrabold mb-8 ${
                        flash === 'ok' ? 'ring-4 ring-green-400' : flash === 'bad' ? 'ring-4 ring-red-400' : ''
                    }`} style={{ background: card.warm ? '#EA580C' : '#0284C7', color: '#fff' }}>
                        {card.n}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => answer(true)}
                            className="px-10 py-3 rounded-xl border border-green-400/50 text-green-400 hover:bg-green-400/10 font-bold transition">{t('brain:ex.switching.yes')}</button>
                        <button onClick={() => answer(false)}
                            className="px-10 py-3 rounded-xl border border-red-400/50 text-red-400 hover:bg-red-400/10 font-bold transition">{t('brain:ex.switching.no')}</button>
                    </div>
                </>
            )}

            {!playing && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                    <p className="text-gray-400 mb-6">{t('brain:ex.switching.resultBlurb')}</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{t('brain:ex.common.playAgain')}</button>
                </div>
            )}
        </div>
    );
}
