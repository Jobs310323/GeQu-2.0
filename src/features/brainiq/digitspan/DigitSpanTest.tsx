import { useEffect, useRef, useState } from 'react';
import { generateSequence, parseDigits, checkAnswer, scoreDigitSpan, MAX_LENGTH, TRIALS_PER_LENGTH, type DigitSpanPart } from './logic';
import { AGE_BRACKETS } from '../norms';
import { saveBrainIqResult } from '../types';

const DIGIT_MS = 900;
const START_LENGTH = 3;

type Phase = 'intro' | 'expose' | 'input' | 'done';

export function DigitSpanTest({ setBrainIqResults }: any) {
    const [phase, setPhase] = useState<Phase>('intro');
    const [ageBracket, setAgeBracket] = useState(2);
    const [part, setPart] = useState<DigitSpanPart>('forward');
    const [length, setLength] = useState(START_LENGTH);
    const [trialNum, setTrialNum] = useState(1);
    const [failsThisLength, setFailsThisLength] = useState(0);
    const [span, setSpan] = useState({ forward: 0, backward: 0 });
    const [sequence, setSequence] = useState<number[]>([]);
    const [digitIdx, setDigitIdx] = useState(0);
    const [input, setInput] = useState('');
    const [feedback, setFeedback] = useState<'right' | 'wrong' | null>(null);
    const exposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (phase !== 'expose') return;
        if (digitIdx >= sequence.length) { setPhase('input'); return; }
        exposeTimer.current = setTimeout(() => setDigitIdx(d => d + 1), DIGIT_MS);
        return () => { if (exposeTimer.current) clearTimeout(exposeTimer.current); };
    }, [phase, digitIdx, sequence.length]);

    function beginTrial(nextPart: DigitSpanPart, nextLength: number) {
        setSequence(generateSequence(nextLength));
        setDigitIdx(0);
        setInput('');
        setFeedback(null);
        setPart(nextPart);
        setLength(nextLength);
        setPhase('expose');
    }

    function start() {
        setSpan({ forward: 0, backward: 0 });
        setTrialNum(1);
        setFailsThisLength(0);
        beginTrial('forward', START_LENGTH);
    }

    function finishPart(finalSpan: number) {
        const newSpan = { ...span, [part]: finalSpan };
        setSpan(newSpan);
        if (part === 'forward') {
            setTrialNum(1);
            setFailsThisLength(0);
            beginTrial('backward', START_LENGTH);
        } else {
            const scaled = scoreDigitSpan(newSpan.forward, newSpan.backward, ageBracket);
            saveBrainIqResult(setBrainIqResults, {
                testId: 'digitspan',
                raw: { forwardSpan: newSpan.forward, backwardSpan: newSpan.backward, total: newSpan.forward + newSpan.backward },
                scaled,
                meta: { ageBracket: AGE_BRACKETS[ageBracket].label },
            });
            setPhase('done');
        }
    }

    function submit() {
        const correct = checkAnswer(sequence, parseDigits(input), part);
        setFeedback(correct ? 'right' : 'wrong');
        setTimeout(() => {
            if (correct) {
                const passedSpan = length;
                if (length >= MAX_LENGTH) { finishPart(passedSpan); return; }
                setTrialNum(1);
                setFailsThisLength(0);
                setSpan(s => ({ ...s, [part]: passedSpan }));
                beginTrial(part, length + 1);
            } else {
                const fails = failsThisLength + 1;
                if (fails >= TRIALS_PER_LENGTH || trialNum >= TRIALS_PER_LENGTH) {
                    finishPart(span[part]);
                } else {
                    setFailsThisLength(fails);
                    setTrialNum(t => t + 1);
                    beginTrial(part, length);
                }
            }
        }, 500);
    }

    if (phase === 'intro') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Повторение цифр (Digit Span)</h3>
                <p className="text-sm gq-muted max-w-md">
                    Сначала — повторить последовательность в том же порядке. Затем — в обратном. Длина растёт, пока не собьётесь дважды подряд.
                </p>
                <label className="text-sm gq-muted flex items-center gap-2">
                    Возраст:
                    <select value={ageBracket} onChange={e => setAgeBracket(Number(e.target.value))} className="gq-input px-2 py-1 rounded-lg">
                        {AGE_BRACKETS.map((b, idx) => <option key={b.label} value={idx}>{b.label}</option>)}
                    </select>
                </label>
                <button onClick={start} className="gq-btn px-8 py-3 rounded-lg font-bold mt-2">Начать</button>
            </div>
        );
    }

    if (phase === 'expose' || phase === 'input') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <div className="text-sm gq-muted">{part === 'forward' ? 'Прямой порядок' : 'Обратный порядок'} · длина {length}</div>
                {phase === 'expose' && digitIdx < sequence.length && (
                    <div className="text-6xl font-extrabold py-10" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{sequence[digitIdx]}</div>
                )}
                {phase === 'input' && (
                    <div className="w-full max-w-xs flex flex-col gap-3">
                        <p className="text-sm gq-muted">
                            {part === 'forward' ? 'Введите цифры в том же порядке:' : 'Введите цифры в обратном порядке:'}
                        </p>
                        <input value={input} onChange={e => setInput(e.target.value)} inputMode="numeric"
                            className="gq-input rounded-lg p-3 text-center text-2xl tracking-widest" autoFocus
                            onKeyDown={e => e.key === 'Enter' && submit()} />
                        <button onClick={submit} className="gq-btn px-6 py-2.5 rounded-lg font-bold self-center">Ответить</button>
                        {feedback && (
                            <span className={feedback === 'right' ? 'text-[var(--gq-good,#22c55e)]' : 'text-[var(--gq-bad,#ef4444)]'}>
                                {feedback === 'right' ? 'Верно' : 'Неверно'}
                            </span>
                        )}
                    </div>
                )}
            </div>
        );
    }

    const scaled = scoreDigitSpan(span.forward, span.backward, ageBracket);
    return (
        <div className="gq-glass p-8 rounded-2xl text-center">
            <h3 className="gq-heading text-lg font-bold mb-4">Результат</h3>
            <div className="flex justify-center gap-4 mb-4">
                <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] text-sm">Прямой: <b>{span.forward}</b></span>
                <span className="px-3 py-1.5 rounded-lg bg-[var(--bg-input)] text-sm">Обратный: <b>{span.backward}</b></span>
            </div>
            <div className="text-4xl font-bold mb-2" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{span.forward + span.backward}</div>
            <div className="text-sm gq-muted mb-6">Суммарный балл · Перцентиль ≈ {scaled.percentile} · Индекс ≈ {scaled.iq}</div>
            <button onClick={start} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Пройти снова</button>
        </div>
    );
}
