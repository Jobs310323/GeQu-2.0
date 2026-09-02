// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { REACTION_ACHIEVEMENTS, achievementName } from '../achievements';
import { recordAttempt } from '../record';
import { Icon } from '../../../components/Icons';
import type { ScoredExerciseProps } from '../../../types/props';

export function ReactionTest({ setTestResults, achievements, setAchievements }: ScoredExerciseProps) {
    const { t } = useTranslation('brain');
    const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'tooSoon'>('idle');
    const [time, setTime] = useState(0);
    const [best, setBest] = useState<number | null>(null);
    const [toast, setToast] = useState('');
    const startTime = useRef(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const addAchievement = (name: string) => {
        if (Array.isArray(achievements) && !achievements.includes(name)) {
            setAchievements(prev => [...prev, name]);
            setToast(t('brain:ex.reaction.achievementToast', { name: achievementName(name, t) }));
            setTimeout(() => setToast(''), 4000);
        }
    };

    const startTest = () => {
        setState('waiting');
        setTime(0);
        const delay = Math.random() * 3000 + 2000;
        timerRef.current = setTimeout(() => {
            setState('ready');
            startTime.current = Date.now();
        }, delay);
    };

    const handleClick = () => {
        if (state === 'idle' || state === 'result' || state === 'tooSoon') {
            startTest();
        } else if (state === 'waiting') {
            clearTimeout(timerRef.current);
            setState('tooSoon');
        } else if (state === 'ready') {
            const rt = Date.now() - startTime.current;
            setTime(rt);
            setState('result');
            recordAttempt(setTestResults, 'reaction', rt);
            if (best === null || rt < best) setBest(rt);
            if (rt < 200) addAchievement(REACTION_ACHIEVEMENTS.superhuman);
            else if (rt < 250) addAchievement(REACTION_ACHIEVEMENTS.lightning);
            else if (rt < 300) addAchievement(REACTION_ACHIEVEMENTS.quickHand);
        }
    };

    const rating = t(`brain:ex.reaction.rating.${
        time < 200 ? 'incredible' : time < 250 ? 'lightning' : time < 300 ? 'great' : time < 400 ? 'good' : 'room'
    }`);

    const bgClass = state === 'ready' ? 'bg-green-500' : state === 'waiting' ? 'bg-red-500/90' : state === 'tooSoon' ? 'bg-orange-500/80' : 'bg-[var(--bg-card)]';

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4 text-center">{t('brain:ex.reaction.blurb')}</p>
            {best !== null && <div className="text-sm text-gray-400 mb-4">{t('brain:ex.reaction.bestThisSession')}<span className="text-cyan-400 font-bold">{best} {t('brain:ex.reaction.ms')}</span></div>}

            {/* A real button, so the test can be taken with the keyboard. These
                measure reaction time, not mouse skill — forcing a pointer
                excludes exactly the users the tool is meant to help. */}
            <button type="button" onClick={handleClick}
                aria-label={t('brain:ex.reaction.area')}
                className={`relative w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] overflow-hidden transition-colors duration-150 ${bgClass}`}>
                {/* waiting: pulsing dots */}
                {state === 'waiting' && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2">
                            {[0, 1, 2].map(i => (
                                <span key={i} className="w-3 h-3 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                        <span className="text-2xl font-bold text-white">{t('brain:ex.reaction.waitGreen')}</span>
                    </div>
                )}
                {state === 'ready' && (
                    <span key="go" style={{ animation: 'popIn 0.15s ease-out' }} className="text-5xl font-extrabold text-white">{t('brain:ex.reaction.click')}</span>
                )}
                {state === 'idle' && <span className="text-3xl font-bold text-white text-center px-4">{t('brain:ex.reaction.pressToStart')}</span>}
                {state === 'tooSoon' && <span className="text-2xl font-bold text-white text-center px-4">{t('brain:ex.reaction.tooSoon')}</span>}
                {state === 'result' && (
                    <div key={time} className="text-center" style={{ animation: 'popIn 0.25s ease-out' }}>
                        <div className="text-6xl font-extrabold text-white tabular-nums">{time}<span className="text-2xl"> {t('brain:ex.reaction.ms')}</span></div>
                        <div className="text-lg text-white/90 mt-2">{rating}</div>
                    </div>
                )}
            </button>

            {state === 'result' && (
                <button onClick={startTest} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    {t('brain:ex.common.tryAgain')}
                </button>
            )}

            {toast && (
                <div className="mt-6 bg-green-400/10 border border-green-400 text-green-400 px-6 py-3 rounded-lg text-sm flex items-center gap-2">
                    <Icon name="trophy" size={16} />
                    {toast}
                </div>
            )}
        </div>
    );
}
