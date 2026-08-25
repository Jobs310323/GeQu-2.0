import { useEffect, useRef, useState } from 'react';
import { SDMT_SYMBOLS, SDMT_DURATION_MS, generateKey, generateSequence, scoreSdmt } from './logic';
import { AGE_BRACKETS } from '../norms';
import { saveBrainIqResult } from '../types';

type Phase = 'intro' | 'running' | 'done';

export function SdmtTest({ setBrainIqResults }: any) {
    const [phase, setPhase] = useState<Phase>('intro');
    const [ageBracket, setAgeBracket] = useState(2);
    const [key, setKey] = useState<Record<string, number>>({});
    const [sequence, setSequence] = useState<string[]>([]);
    const [pos, setPos] = useState(0);
    const [correct, setCorrect] = useState(0);
    const [remainingMs, setRemainingMs] = useState(SDMT_DURATION_MS);
    const endsAt = useRef(0);
    const finished = useRef(false);

    function start() {
        setKey(generateKey());
        setSequence(generateSequence());
        setPos(0);
        setCorrect(0);
        setRemainingMs(SDMT_DURATION_MS);
        finished.current = false;
        endsAt.current = Date.now() + SDMT_DURATION_MS;
        setPhase('running');
    }

    useEffect(() => {
        if (phase !== 'running') return;
        const id = setInterval(() => {
            const left = endsAt.current - Date.now();
            setRemainingMs(Math.max(0, left));
            if (left <= 0 && !finished.current) {
                finished.current = true;
                clearInterval(id);
                finish();
            }
        }, 100);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    function finish() {
        setPhase(p => (p === 'running' ? 'done' : p));
        setCorrect(c => {
            const scaled = scoreSdmt(c, ageBracket);
            saveBrainIqResult(setBrainIqResults, {
                testId: 'sdmt',
                raw: { correct: c },
                scaled,
                meta: { ageBracket: AGE_BRACKETS[ageBracket].label },
            });
            return c;
        });
    }

    function answer(digit: number) {
        if (finished.current) return;
        if (digit === key[sequence[pos]]) setCorrect(c => c + 1);
        setPos(p => p + 1);
    }

    if (phase === 'intro') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Символьно-цифровой тест (SDMT)</h3>
                <p className="text-sm gq-muted max-w-md">
                    Ключ символ → цифра виден всё время. За 90 секунд ответьте на как можно больше символов.
                </p>
                <label className="text-sm gq-muted flex items-center gap-2">
                    Возраст:
                    <select value={ageBracket} onChange={e => setAgeBracket(Number(e.target.value))} className="gq-input px-2 py-1 rounded-lg">
                        {AGE_BRACKETS.map((b, idx) => <option key={b.label} value={idx}>{b.label}</option>)}
                    </select>
                </label>
                <button onClick={start} className="gq-btn px-8 py-3 rounded-lg font-bold mt-2">Начать (90 сек)</button>
            </div>
        );
    }

    if (phase === 'running') {
        return (
            <div className="gq-glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4 text-sm gq-muted">
                    <span>Верно: {correct}</span>
                    <span className="tabular-nums text-lg font-bold" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{Math.ceil(remainingMs / 1000)}s</span>
                </div>
                <div className="flex justify-center gap-2 mb-8 flex-wrap">
                    {SDMT_SYMBOLS.map(s => (
                        <div key={s} className="flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg bg-[var(--bg-input)] border border-[var(--border)]">
                            <span className="text-xl">{s}</span>
                            <span className="text-xs gq-muted">{key[s]}</span>
                        </div>
                    ))}
                </div>
                <div className="text-7xl text-center mb-8">{sequence[pos]}</div>
                <div className="flex justify-center gap-2 flex-wrap max-w-md mx-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                        <button key={d} onClick={() => answer(d)}
                            className="w-11 h-11 rounded-xl border border-[var(--border)] hover:bg-white/10 text-lg font-bold">
                            {d}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const scaled = scoreSdmt(correct, ageBracket);
    return (
        <div className="gq-glass p-8 rounded-2xl text-center">
            <div className="text-5xl font-bold mb-2" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{correct}</div>
            <div className="text-sm gq-muted mb-6">Правильных ответов за 90 сек · Перцентиль ≈ {scaled.percentile} · Индекс ≈ {scaled.iq}</div>
            <button onClick={start} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Пройти снова</button>
        </div>
    );
}
