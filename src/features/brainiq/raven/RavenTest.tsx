import { useMemo, useRef, useState } from 'react';
import type { RavenCell, RavenShape } from './types';
import { generateRavenBank, scoreRaven, AGE_BRACKETS, RAVEN_ITEM_COUNT } from './logic';
import { saveBrainIqResult } from '../types';

const SHAPE_PATH: Record<RavenShape, string> = {
    circle: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
    square: 'M3 3h18v18H3z',
    triangle: 'M12 2l10 20H2z',
    diamond: 'M12 2l10 10-10 10L2 12z',
    star: 'M12 1.5l2.7 6.7 7.2.6-5.5 4.7 1.7 7-6.1-3.8-6.1 3.8 1.7-7-5.5-4.7 7.2-.6z',
    hexagon: 'M12 2l8.7 5v10l-8.7 5-8.7-5V7z',
};

function ShapeGlyph({ shape, filled, rotation, size = 22 }: { shape: RavenShape; filled: boolean; rotation: number; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: `rotate(${rotation}deg)` }}>
            <path d={SHAPE_PATH[shape]} fill={filled ? 'var(--gq-grad-a, #7c6cf6)' : 'none'}
                stroke="var(--gq-grad-a, #7c6cf6)" strokeWidth={filled ? 0 : 1.8} strokeLinejoin="round" />
        </svg>
    );
}

function CellView({ cell, muted = false }: { cell: RavenCell | null; muted?: boolean }) {
    return (
        <div className="aspect-square rounded-xl flex items-center justify-center gap-0.5"
            style={{ background: muted ? 'transparent' : 'var(--bg-input)', border: `1px solid ${muted ? 'transparent' : 'var(--border)'}` }}>
            {cell
                ? Array.from({ length: cell.count }, (_, i) => (
                    <ShapeGlyph key={i} shape={cell.shape} filled={cell.filled} rotation={cell.rotation} />
                ))
                : <span className="text-2xl gq-muted">?</span>}
        </div>
    );
}

type Phase = 'setup' | 'running' | 'done';

export function RavenTest({ setBrainIqResults }: any) {
    const [phase, setPhase] = useState<Phase>('setup');
    const [ageBracket, setAgeBracket] = useState(2);
    const bank = useMemo(() => generateRavenBank(), []);
    const [i, setI] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [picked, setPicked] = useState<number | null>(null);
    const startedAt = useRef(0);
    const [elapsedMs, setElapsedMs] = useState(0);

    const item = bank[i];

    function start() {
        setI(0); setCorrectCount(0); setPicked(null);
        startedAt.current = Date.now();
        setPhase('running');
    }

    function choose(optIndex: number) {
        if (picked !== null) return;
        setPicked(optIndex);
        const isCorrect = optIndex === item.correctIndex;
        if (isCorrect) setCorrectCount(c => c + 1);
        setTimeout(() => {
            if (i + 1 >= bank.length) {
                const ms = Date.now() - startedAt.current;
                setElapsedMs(ms);
                const finalCorrect = isCorrect ? correctCount + 1 : correctCount;
                const scaled = scoreRaven(finalCorrect, ageBracket);
                saveBrainIqResult(setBrainIqResults, {
                    testId: 'raven',
                    raw: { correct: finalCorrect, total: bank.length, elapsedMs: ms },
                    scaled,
                    meta: { ageBracket: AGE_BRACKETS[ageBracket].label },
                });
                setPhase('done');
            } else {
                setI(i + 1);
                setPicked(null);
            }
        }, 350);
    }

    if (phase === 'setup') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Матрицы (невербальный IQ)</h3>
                <p className="text-sm gq-muted max-w-md">
                    {RAVEN_ITEM_COUNT} заданий: найдите фигуру, дополняющую матрицу по правилу. Время не ограничено, но фиксируется.
                </p>
                <label className="text-sm gq-muted flex items-center gap-2">
                    Возраст:
                    <select value={ageBracket} onChange={e => setAgeBracket(Number(e.target.value))}
                        className="gq-input px-2 py-1 rounded-lg">
                        {AGE_BRACKETS.map((b, idx) => <option key={b.label} value={idx}>{b.label}</option>)}
                    </select>
                </label>
                <button onClick={start} className="gq-btn px-8 py-3 rounded-lg font-bold mt-2">Начать</button>
            </div>
        );
    }

    if (phase === 'running') {
        return (
            <div className="gq-glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4 text-sm gq-muted">
                    <span>Вопрос {i + 1} / {bank.length}</span>
                    <span>Верно: {correctCount}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-input)] mb-6 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(i / bank.length) * 100}%`, background: 'var(--gq-grad-a, #7c6cf6)' }} />
                </div>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto mb-8">
                    {item.grid.slice(0, 8).map((c, idx) => <CellView key={idx} cell={c} />)}
                    <CellView cell={null} />
                </div>
                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                    {item.options.map((opt, idx) => {
                        const isPicked = picked === idx;
                        const isRight = picked !== null && idx === item.correctIndex;
                        const isWrong = isPicked && !isRight;
                        return (
                            <button key={idx} disabled={picked !== null} onClick={() => choose(idx)}
                                className="rounded-xl p-1 transition"
                                style={{
                                    outline: isRight ? '2px solid var(--gq-good, #22c55e)' : isWrong ? '2px solid var(--gq-bad, #ef4444)' : 'none',
                                }}>
                                <CellView cell={opt} />
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    const scaled = scoreRaven(correctCount, ageBracket);
    return (
        <div className="gq-glass p-8 rounded-2xl text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{correctCount} / {bank.length}</div>
            <div className="text-sm gq-muted mb-4">
                Перцентиль ≈ {scaled.percentile} · Ориентировочный IQ ≈ {scaled.iq} · Время: {Math.round(elapsedMs / 1000)} сек
            </div>
            <p className="text-xs gq-muted mb-6 max-w-sm mx-auto">Оценка приблизительная, без клинической валидации — не диагностический инструмент.</p>
            <button onClick={() => setPhase('setup')} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Пройти снова</button>
        </div>
    );
}
