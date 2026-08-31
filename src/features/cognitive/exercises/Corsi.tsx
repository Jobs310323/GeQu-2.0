// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';

export function CorsiTest({ setTestResults }: ExerciseProps) {
    const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'over'>('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [entered, setEntered] = useState<number[]>([]);
    const [lit, setLit] = useState<number | null>(null);
    const [span, setSpan] = useState(2);
    const [best, setBest] = useState(0);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    useEffect(() => clearTimers, []);

    const playSequence = (seq: number[]) => {
        setPhase('showing');
        setEntered([]);
        clearTimers();
        seq.forEach((cell, i) => {
            timers.current.push(setTimeout(() => setLit(cell), i * 800));
            timers.current.push(setTimeout(() => setLit(null), i * 800 + 500));
        });
        timers.current.push(setTimeout(() => setPhase('input'), seq.length * 800));
    };

    const startRound = (length: number) => {
        const seq: number[] = [];
        while (seq.length < length) {
            const n = Math.floor(Math.random() * 9);
            if (seq[seq.length - 1] !== n) seq.push(n); // never flash the same cell twice running
        }
        setSequence(seq);
        setSpan(length);
        playSequence(seq);
    };

    const start = () => { setBest(0); startRound(2); };

    const tap = (cell: number) => {
        if (phase !== 'input') return;
        const next = [...entered, cell];
        setEntered(next);

        if (sequence[next.length - 1] !== cell) {          // a wrong tap ends the run
            const reached = Math.max(span - 1, 0);
            setBest(reached);
            recordAttempt(setTestResults, 'corsi', reached);
            setPhase('over');
            return;
        }
        if (next.length === sequence.length) {              // whole sequence repeated
            setBest(span);
            timers.current.push(setTimeout(() => startRound(span + 1), 700));
        }
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-2 text-center">Запомни порядок вспышек и повтори его, нажимая на квадраты.</p>
            <div className="flex gap-6 mb-6 text-sm">
                <span className="text-gray-400">Длина: <b className="text-cyan-400">{span}</b></span>
                <span className="text-gray-400">Лучшее: <b className="text-purple-400">{best}</b></span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-72 aspect-square mb-6">
                {Array.from({ length: 9 }).map((_, i) => (
                    <button key={i} type="button" onClick={() => tap(i)} disabled={phase !== 'input'}
                        aria-label={`Ячейка ${i + 1} из 9`}
                        className={`rounded-xl border transition-all duration-100 ${
                            lit === i ? 'bg-cyan-400 border-cyan-400 scale-95 shadow-lg shadow-cyan-400/50'
                                : entered.includes(i) && phase === 'input' ? 'bg-purple-400/30 border-purple-400'
                                : 'bg-[var(--bg-input)] border-[var(--border)]'
                        } ${phase === 'input' ? 'cursor-pointer hover:border-cyan-400/60' : 'cursor-default'}`} />
                ))}
            </div>

            {phase === 'idle' && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать</button>
            )}
            {phase === 'showing' && <p className="text-cyan-400 text-sm animate-pulse">Смотри внимательно…</p>}
            {phase === 'input' && <p className="text-gray-400 text-sm">Повтори: {entered.length} / {sequence.length}</p>}
            {phase === 'over' && (
                <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-1">{best}</div>
                    <p className="text-gray-400 mb-4 text-sm">Максимальная длина последовательности</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Ещё раз</button>
                </div>
            )}
        </div>
    );
}

/** Mental arithmetic against the clock — processing speed under mild pressure. */
