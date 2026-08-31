import { useEffect } from 'react';
import { useAppUi } from '../stores/app-ui.store';

/**
 * Drives the Pomodoro countdown from above the routes, so navigating away from
 * the timer tab does not pause or reset a running session — only the tab
 * unmounts, not the clock.
 *
 * Renders nothing; mount it once inside the shell.
 */
export function PomodoroTicker() {
    const isRunning = useAppUi(s => s.pomodoro.isRunning);
    const setPomodoro = useAppUi(s => s.setPomodoro);

    useEffect(() => {
        if (!isRunning) return;
        const id = setInterval(() => {
            setPomodoro(p => {
                if (p.timeLeft > 1) return { ...p, timeLeft: p.timeLeft - 1 };
                // A finished interval flips mode and stops, rather than rolling
                // straight into the next one — starting a break is a decision.
                const nextMode = p.mode === 'work' ? 'break' : 'work';
                return {
                    ...p,
                    mode: nextMode,
                    timeLeft: nextMode === 'work' ? p.workTime * 60 : 5 * 60,
                    isRunning: false,
                };
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isRunning, setPomodoro]);

    return null;
}
