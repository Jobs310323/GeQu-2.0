// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect } from 'react';

type BreathPhase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'finished';

export function BreathingExercise() {
    const [phase, setPhase] = useState<BreathPhase>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [cycles, setCycles] = useState(0);
    const targetCycles = 4;
    const secondsPerSide = 4; // квадратное дыхание 4-4-4-4

    useEffect(() => {
        if (phase === 'idle' || phase === 'finished') return;

        if (timeLeft <= 0) {
            if (phase === 'inhale') { setPhase('hold1'); setTimeLeft(secondsPerSide); }
            else if (phase === 'hold1') { setPhase('exhale'); setTimeLeft(secondsPerSide); }
            else if (phase === 'exhale') { setPhase('hold2'); setTimeLeft(secondsPerSide); }
            else if (phase === 'hold2') {
                if (cycles + 1 >= targetCycles) { setPhase('finished'); }
                else { setCycles(c => c + 1); setPhase('inhale'); setTimeLeft(secondsPerSide); }
            }
            return;
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, phase, cycles]);

    const start = () => { setCycles(0); setPhase('inhale'); setTimeLeft(secondsPerSide); };

    // The indicator travels one side of the square per phase (clockwise from the
    // bottom-left corner). `to` is the corner it animates toward this phase.
    const SIDE = 260;                       // square side in px
    const corners = {
        bl: { left: 0, top: SIDE },
        tl: { left: 0, top: 0 },
        tr: { left: SIDE, top: 0 },
        br: { left: SIDE, top: SIDE },
    };
    const config: Record<BreathPhase, { to: keyof typeof corners; label: string; accent: string }> = {
        idle:     { to: 'bl', label: 'Готов?',   accent: 'var(--text-muted)' },
        inhale:   { to: 'tl', label: 'Вдох',     accent: 'var(--accent-cyan)' },
        hold1:    { to: 'tr', label: 'Задержи',  accent: 'var(--accent-purple)' },
        exhale:   { to: 'br', label: 'Выдох',    accent: 'var(--accent-pink)' },
        hold2:    { to: 'bl', label: 'Задержи',  accent: 'var(--accent-purple)' },
        finished: { to: 'bl', label: 'Готово!',  accent: '#22c55e' },
    };
    const active = config[phase];
    const dot = corners[active.to];
    const moving = phase !== 'idle' && phase !== 'finished';
    // Which side is currently lit (the one the dot travels along).
    const litSide = phase; // 'inhale'|'hold1'|'exhale'|'hold2'

    const sideStyle = (name: BreathPhase, on: boolean) => ({
        background: litSide === name && on ? active.accent : 'var(--border)',
        boxShadow: litSide === name && on ? `0 0 12px ${active.accent}` : 'none',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
    });

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center justify-center min-h-[60vh]">
            <h3 className="text-2xl font-bold text-white mb-2">Квадратное дыхание (4-4-4-4)</h3>
            <p className="text-gray-400 mb-10 text-sm text-center">Веди дыхание по сторонам квадрата: вдох, задержка, выдох, задержка. Цикл: {cycles}/{targetCycles}</p>

            <div className="relative mb-10" style={{ width: SIDE, height: SIDE }}>
                {/* Square edges (light up on the active side) */}
                <div className="absolute rounded-full" style={{ left: 0, top: 0, width: 4, height: SIDE, transform: 'translateX(-2px)', ...sideStyle('inhale', moving) }} />
                <div className="absolute rounded-full" style={{ left: 0, top: 0, width: SIDE, height: 4, transform: 'translateY(-2px)', ...sideStyle('hold1', moving) }} />
                <div className="absolute rounded-full" style={{ left: SIDE, top: 0, width: 4, height: SIDE, transform: 'translateX(-2px)', ...sideStyle('exhale', moving) }} />
                <div className="absolute rounded-full" style={{ left: 0, top: SIDE, width: SIDE, height: 4, transform: 'translateY(-2px)', ...sideStyle('hold2', moving) }} />

                {/* Center label + countdown */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold" style={{ color: active.accent }}>{active.label}</span>
                    {moving && <span className="text-6xl font-bold text-white/80 mt-1 tabular-nums">{timeLeft}</span>}
                </div>

                {/* Travelling indicator */}
                <div
                    className={moving ? 'breath-dot' : ''}
                    style={{
                        position: 'absolute',
                        width: 22, height: 22, borderRadius: '9999px',
                        background: active.accent,
                        left: dot.left, top: dot.top,
                        transform: 'translate(-50%, -50%)',
                        transition: moving ? `left ${secondsPerSide}s linear, top ${secondsPerSide}s linear` : 'none',
                    }}
                />
            </div>

            {phase === 'finished' ? (
                <div className="text-center">
                    <p className="text-gray-300 mb-4">Сессия завершена. Ты молодец! 🌿</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать заново</button>
                </div>
            ) : phase === 'idle' ? (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать дыхание</button>
            ) : (
                <button onClick={() => setPhase('finished')} className="text-gray-500 hover:text-red-400 text-sm underline">Прервать сессию</button>
            )}
        </div>
    );
}
