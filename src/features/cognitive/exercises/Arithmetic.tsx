// Extracted from the 1126-line `features/training/tests.tsx` in Phase 9.
// Behaviour is unchanged; only the file boundary moved.

import { useState, useEffect, useRef } from 'react';
import { recordAttempt } from '../record';
import type { ExerciseProps } from '../../../types/props';
import type { FormEvent } from 'react';

export function ArithmeticTest({ setTestResults }: ExerciseProps) {
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(60);
    const [score, setScore] = useState(0);
    const [task, setTask] = useState<{ text: string; answer: number } | null>(null);
    const [input, setInput] = useState('');
    const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
    const scoreRef = useRef(0);

    useEffect(() => { scoreRef.current = score; }, [score]);

    const makeTask = () => {
        const ops = ['+', '−', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a: number, b: number, answer: number;
        if (op === '×') { a = 2 + Math.floor(Math.random() * 11); b = 2 + Math.floor(Math.random() * 11); answer = a * b; }
        else if (op === '+') { a = 10 + Math.floor(Math.random() * 80); b = 10 + Math.floor(Math.random() * 80); answer = a + b; }
        else { a = 20 + Math.floor(Math.random() * 80); b = 5 + Math.floor(Math.random() * 40); answer = a - b; }
        setTask({ text: `${a} ${op} ${b}`, answer });
    };

    const start = () => { setScore(0); setTime(60); setInput(''); setPlaying(true); makeTask(); };

    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [playing]);

    // Ending lives in its own effect, so no state update happens inside the timer updater.
    useEffect(() => {
        if (playing && time <= 0) {
            setPlaying(false);
            recordAttempt(setTestResults, 'arithmetic', scoreRef.current);
        }
    }, [time, playing, setTestResults]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!playing || !task || input === '') return;
        const correct = Number(input) === task.answer;
        setScore(s => (correct ? s + 1 : Math.max(0, s - 1)));
        setFlash(correct ? 'ok' : 'bad');
        setTimeout(() => setFlash(null), 250);
        setInput('');
        makeTask();
    };

    return (
        <div className="glass-card p-4 sm:p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Считай в уме как можно быстрее. За ошибку —1 балл.</p>

            {!playing && time === 60 && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать (60 сек)</button>
            )}

            {playing && task && (
                <>
                    <div className="flex gap-8 mb-6 text-xl">
                        <span>Очки: <b className="text-cyan-400">{score}</b></span>
                        <span>Время: <b className="text-pink-400">{time}s</b></span>
                    </div>
                    <div className={`text-6xl font-extrabold mb-6 transition-colors ${
                        flash === 'ok' ? 'text-green-400' : flash === 'bad' ? 'text-red-400' : 'text-white'
                    }`}>
                        {task.text}
                    </div>
                    <form onSubmit={submit}>
                        <input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)}
                            className="bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl px-6 py-3 text-3xl text-center w-48 outline-none focus:border-cyan-400 text-white" />
                    </form>
                    <p className="text-xs text-gray-500 mt-3">Enter — ответить</p>
                </>
            )}

            {!playing && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                    <p className="text-gray-400 mb-6">Правильных ответов за минуту</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>
                </div>
            )}
        </div>
    );
}

/**
 * Task switching — the rule flips between "is the number even?" and "is the
 * colour warm?", which makes the cost of switching sets visible.
 */
