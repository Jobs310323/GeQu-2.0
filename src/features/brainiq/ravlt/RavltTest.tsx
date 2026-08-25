import { useEffect, useRef, useState } from 'react';
import { DB } from '../../../lib/db';
import { RAVLT_WORDS, scoreRecall, scoreDelayed } from './logic';
import { RAVLT_INTERVAL_MS, type RavltSession } from './types';
import { AGE_BRACKETS } from '../norms';
import { saveBrainIqResult } from '../types';

const SESSION_KEY = 'brainiqRavltSession';
const EXPOSURE_MS = 1400;

const DEFAULT_SESSION: RavltSession = {
    phase: 'intro', trial: 1, trialCounts: [], waitUntil: null, delayedCount: null, ageBracket: 2,
};

function fmtRemaining(ms: number): string {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function RavltTest({ setBrainIqResults }: any) {
    const [session, setSession] = useState<RavltSession>(() => DB.get(SESSION_KEY, DEFAULT_SESSION));
    const [exposing, setExposing] = useState(false);
    const [wordIdx, setWordIdx] = useState(0);
    const [recallInput, setRecallInput] = useState('');
    const [now, setNow] = useState(Date.now());

    function persist(next: RavltSession) {
        setSession(next);
        DB.save(SESSION_KEY, next);
    }

    // Tick while waiting out the 20-minute interval, and auto-advance once due.
    useEffect(() => {
        if (session.phase !== 'interval') return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [session.phase]);

    useEffect(() => {
        if (session.phase === 'interval' && session.waitUntil !== null && Date.now() >= session.waitUntil) {
            persist({ ...session, phase: 'delayed' });
        }
    }, [now, session]);

    // Word-by-word exposure for the current learning trial.
    const exposeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    function startExposure() {
        setWordIdx(0);
        setExposing(true);
    }
    useEffect(() => {
        if (!exposing) return;
        if (wordIdx >= RAVLT_WORDS.length) { setExposing(false); return; }
        exposeTimer.current = setTimeout(() => setWordIdx(w => w + 1), EXPOSURE_MS);
        return () => { if (exposeTimer.current) clearTimeout(exposeTimer.current); };
    }, [exposing, wordIdx]);

    function submitTrial() {
        const { count } = scoreRecall(recallInput);
        const trialCounts = [...session.trialCounts, count];
        setRecallInput('');
        if (session.trial >= 5) {
            persist({ ...session, trialCounts, phase: 'interval', waitUntil: Date.now() + RAVLT_INTERVAL_MS });
        } else {
            persist({ ...session, trialCounts, trial: session.trial + 1 });
        }
    }

    function submitDelayed() {
        const { count } = scoreRecall(recallInput);
        const scaled = scoreDelayed(count, session.ageBracket);
        saveBrainIqResult(setBrainIqResults, {
            testId: 'ravlt',
            raw: { delayed: count, ...Object.fromEntries(session.trialCounts.map((c, i) => [`trial${i + 1}`, c])) },
            scaled,
            meta: { ageBracket: AGE_BRACKETS[session.ageBracket].label, trialCounts: session.trialCounts },
        });
        persist({ ...session, delayedCount: count, phase: 'done' });
        setRecallInput('');
    }

    function restart() {
        persist(DEFAULT_SESSION);
        setRecallInput('');
    }

    if (session.phase === 'intro') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Вербальное обучение (RAVLT)</h3>
                <p className="text-sm gq-muted max-w-md">
                    15 слов, 5 попыток запоминания подряд, затем отсроченное воспроизведение через 20 минут.
                    Можно свернуть вкладку и вернуться позже — таймер идёт по реальному времени.
                </p>
                <label className="text-sm gq-muted flex items-center gap-2">
                    Возраст:
                    <select value={session.ageBracket} onChange={e => persist({ ...session, ageBracket: Number(e.target.value) })}
                        className="gq-input px-2 py-1 rounded-lg">
                        {AGE_BRACKETS.map((b, idx) => <option key={b.label} value={idx}>{b.label}</option>)}
                    </select>
                </label>
                <button onClick={() => persist({ ...session, phase: 'trial' })} className="gq-btn px-8 py-3 rounded-lg font-bold mt-2">Начать</button>
            </div>
        );
    }

    if (session.phase === 'trial') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <div className="text-sm gq-muted">Попытка {session.trial} / 5</div>
                {!exposing && wordIdx === 0 && (
                    <button onClick={startExposure} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Показать слова</button>
                )}
                {exposing && wordIdx < RAVLT_WORDS.length && (
                    <div className="text-5xl font-extrabold py-10" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{RAVLT_WORDS[wordIdx]}</div>
                )}
                {!exposing && wordIdx >= RAVLT_WORDS.length && (
                    <div className="w-full max-w-sm flex flex-col gap-3">
                        <p className="text-sm gq-muted">Напишите все слова, что вспомнили (через пробел или запятую):</p>
                        <textarea value={recallInput} onChange={e => setRecallInput(e.target.value)}
                            className="gq-input rounded-lg p-3 min-h-[90px]" placeholder="слово1 слово2 слово3 …" />
                        <button onClick={submitTrial} className="gq-btn px-6 py-2.5 rounded-lg font-bold self-center">
                            {session.trial >= 5 ? 'Завершить попытки' : 'Далее попытка'}
                        </button>
                    </div>
                )}
                {session.trialCounts.length > 0 && (
                    <div className="flex gap-2 text-xs gq-muted">
                        {session.trialCounts.map((c, i) => <span key={i} className="px-2 py-1 rounded-lg bg-[var(--bg-input)]">П{i + 1}: {c}</span>)}
                    </div>
                )}
            </div>
        );
    }

    if (session.phase === 'interval') {
        const remaining = session.waitUntil ? session.waitUntil - now : 0;
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Интервал ожидания</h3>
                <p className="text-sm gq-muted max-w-sm">Отсроченное воспроизведение будет доступно через:</p>
                <div className="text-5xl font-bold tabular-nums" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{fmtRemaining(remaining)}</div>
                <p className="text-xs gq-muted max-w-sm">Можно уйти на другую страницу — прогресс сохранён, таймер продолжит идти.</p>
            </div>
        );
    }

    if (session.phase === 'delayed') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Отсроченное воспроизведение</h3>
                <p className="text-sm gq-muted max-w-sm">Напишите все 15 слов, что помните, без повторного показа:</p>
                <textarea value={recallInput} onChange={e => setRecallInput(e.target.value)}
                    className="gq-input rounded-lg p-3 min-h-[90px] w-full max-w-sm" placeholder="слово1 слово2 слово3 …" />
                <button onClick={submitDelayed} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Завершить</button>
            </div>
        );
    }

    // done
    const scaled = session.delayedCount !== null ? scoreDelayed(session.delayedCount, session.ageBracket) : null;
    return (
        <div className="gq-glass p-8 rounded-2xl text-center">
            <h3 className="gq-heading text-lg font-bold mb-4">Результат</h3>
            <div className="flex justify-center gap-2 mb-4 text-xs gq-muted flex-wrap">
                {session.trialCounts.map((c, i) => <span key={i} className="px-2.5 py-1 rounded-lg bg-[var(--bg-input)]">Попытка {i + 1}: {c}/15</span>)}
            </div>
            <div className="text-4xl font-bold mb-2" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{session.delayedCount} / 15</div>
            <div className="text-sm gq-muted mb-4">Отсроченное воспроизведение{scaled && <> · Перцентиль ≈ {scaled.percentile} · Индекс ≈ {scaled.iq}</>}</div>
            <p className="text-xs gq-muted mb-6 max-w-sm mx-auto">Кривая обучения выше показывает, как растёт запоминание от попытки к попытке — это отдельный маркер обучаемости, не только объёма памяти.</p>
            <button onClick={restart} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Пройти снова</button>
        </div>
    );
}
