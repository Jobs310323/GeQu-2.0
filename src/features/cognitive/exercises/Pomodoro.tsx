// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import type { Setter } from '../../../types/props';
import { useTranslation } from 'react-i18next';
import type { Pomodoro } from '../../../stores/app-ui.store';

export function PomodoroTimer({ pomodoro, setPomodoro }: { pomodoro: Pomodoro; setPomodoro: Setter<Pomodoro> }) {
    const { t } = useTranslation('brain');
    const workDurations = [5, 10, 15, 20, 25, 30];
    const { workTime, mode, timeLeft, isRunning } = pomodoro;

    const changeDuration = (mins: number) => setPomodoro({ workTime: mins, mode: 'work', timeLeft: mins * 60, isRunning: false });
    const toggleRun = () => setPomodoro((p) => ({ ...p, isRunning: !p.isRunning }));
    const reset = () => setPomodoro((p) => ({ ...p, isRunning: false, mode: 'work', timeLeft: p.workTime * 60 }));

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
                {workDurations.map(m => (
                    <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-1 rounded-lg text-sm transition ${workTime === m && mode === 'work' ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-[var(--border)]'}`}>{t('brain:ex.pomodoro.minutes', { count: m })}</button>
                ))}
            </div>
            <div className={`text-2xl mb-4 font-semibold ${mode === 'work' ? 'text-cyan-400' : 'text-green-400'}`}>{mode === 'work' ? t('brain:ex.pomodoro.focusTime') : t('brain:ex.pomodoro.break')}</div>
            <div className="text-8xl font-bold mb-8 tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
            <div className="flex gap-4">
                <button onClick={toggleRun} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{isRunning ? t('brain:ex.pomodoro.pause') : t('brain:ex.pomodoro.start')}</button>
                <button onClick={reset} className="border border-[var(--border)] text-gray-400 px-8 py-3 rounded-lg hover:bg-white/5">{t('brain:ex.pomodoro.reset')}</button>
            </div>
            <input type="text" placeholder={t('brain:ex.pomodoro.taskPlaceholder')} className="mt-8 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 w-full max-w-md text-center text-lg outline-none focus:border-cyan-400" />
        </div>
    );
}

/**
 * Corsi block-tapping — visuospatial working memory. Complements Digit Span,
 * which is verbal: the two often diverge sharply in ADHD.
 */
