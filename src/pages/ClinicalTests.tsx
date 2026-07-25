import { useState } from 'react';
import { CLINICAL_TESTS, scoreTest, bandFor, TONE_CLASS, type ClinicalTest } from '../lib/clinicalTests';

/** One completed run, kept so trends over time are visible. */
type Result = { id: number; testId: string; date: string; score: number; label: string };

function Runner({ test, onFinish, onCancel }: { test: ClinicalTest; onFinish: (score: number) => void; onCancel: () => void }) {
    const [answers, setAnswers] = useState<(number | null)[]>(Array(test.questions.length).fill(null));

    const answered = answers.filter(a => a !== null).length;
    const complete = answered === test.questions.length;
    const progress = (answered / test.questions.length) * 100;

    const pick = (qi: number, val: number) =>
        setAnswers(prev => prev.map((a, i) => (i === qi ? val : a)));

    return (
        <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-1">
                <h2 className="text-xl font-bold">{test.name}</h2>
                <button onClick={onCancel} className="text-sm text-gray-500 hover:text-white">Выйти</button>
            </div>
            <p className="text-sm text-gray-400 mb-1">{test.intro}</p>
            <p className="text-xs text-cyan-400 mb-4">{test.period}</p>

            <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden mb-6">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-300"
                    style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-5">
                {test.questions.map((q, qi) => (
                    <div key={qi} className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)]">
                        <div className="text-sm text-gray-200 mb-3">
                            <span className="text-gray-500 mr-1.5">{qi + 1}.</span>{q}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {test.options.map(o => (
                                <button key={o.val} onClick={() => pick(qi, o.val)}
                                    className={`px-3 py-1.5 rounded-lg text-xs border transition ${
                                        answers[qi] === o.val
                                            ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/50 font-bold'
                                            : 'border-[var(--border)] text-gray-400 hover:text-white hover:border-cyan-400/30'
                                    }`}>
                                    {o.text}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={() => onFinish(scoreTest(test, answers))}
                disabled={!complete}
                className="mt-6 w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg disabled:opacity-40"
            >
                {complete ? 'Посмотреть результат' : `Отвечено ${answered} из ${test.questions.length}`}
            </button>
        </div>
    );
}

export function ClinicalTests({ clinicalResults, setClinicalResults }: any) {
    const [running, setRunning] = useState<ClinicalTest | null>(null);
    const [justFinished, setJustFinished] = useState<{ test: ClinicalTest; score: number } | null>(null);

    const results: Result[] = clinicalResults ?? [];

    const finish = (test: ClinicalTest, score: number) => {
        const band = bandFor(test, score);
        setClinicalResults([
            ...results,
            { id: Date.now(), testId: test.id, date: new Date().toISOString(), score, label: band.label },
        ]);
        setRunning(null);
        setJustFinished({ test, score });
    };

    const lastOf = (id: string) =>
        [...results].filter(r => r.testId === id).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;

    if (running) {
        return (
            <div className="max-w-3xl">
                <h1 className="text-3xl font-bold mb-6">Клинические тесты</h1>
                <Runner test={running} onFinish={s => finish(running, s)} onCancel={() => setRunning(null)} />
            </div>
        );
    }

    if (justFinished) {
        const { test, score } = justFinished;
        const band = bandFor(test, score);
        const history = results.filter(r => r.testId === test.id).sort((a, b) => a.date.localeCompare(b.date));
        const prev = history.length >= 2 ? history[history.length - 2] : null;
        const delta = prev ? score - prev.score : null;
        // For WHO-5 a rising score is good; for every other instrument it isn't.
        const higherIsBetter = test.id === 'who5';

        return (
            <div className="max-w-3xl">
                <h1 className="text-3xl font-bold mb-6">Результат</h1>
                <div className={`glass-card p-8 rounded-2xl border text-center ${TONE_CLASS[band.tone]}`}>
                    <div className="text-sm opacity-80 mb-2">{test.name}</div>
                    <div className="text-6xl font-extrabold mb-2 tabular-nums">
                        {score}<span className="text-2xl opacity-60">/{test.maxScore}</span>
                    </div>
                    <div className="text-xl font-bold mb-3">{band.label}</div>
                    {delta !== null && (
                        <div className="text-sm opacity-80">
                            {delta === 0 ? 'Столько же, сколько в прошлый раз'
                                : `${delta > 0 ? '+' : ''}${delta} к прошлому разу — ${
                                    (delta > 0) === higherIsBetter ? 'в лучшую сторону' : 'в худшую сторону'}`}
                        </div>
                    )}
                </div>

                {test.note && (
                    <div className="glass-card p-4 rounded-2xl mt-4 text-sm text-gray-300">{test.note}</div>
                )}

                <div className="flex flex-wrap gap-3 mt-6">
                    <button onClick={() => setJustFinished(null)}
                        className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">
                        К списку тестов
                    </button>
                    <button onClick={() => { setJustFinished(null); setRunning(test); }}
                        className="px-6 py-3 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white">
                        Пройти заново
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl">
            <h1 className="text-3xl font-bold mb-2">Клинические тесты</h1>
            <p className="text-gray-400 text-sm mb-6">
                Скрининговые опросники, которыми пользуются специалисты. Проходи их периодически, чтобы видеть динамику своего состояния.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CLINICAL_TESTS.map(test => {
                    const last = lastOf(test.id);
                    const band = last ? bandFor(test, last.score) : null;
                    return (
                        <div key={test.id} className="glass-card p-5 rounded-2xl flex flex-col">
                            <div className="flex items-start justify-between gap-3 mb-2">
                                <h2 className="text-lg font-bold">{test.name}</h2>
                                <span className="text-xs text-gray-500 whitespace-nowrap">{test.questions.length} вопр.</span>
                            </div>
                            <p className="text-sm text-gray-400 mb-4 flex-1">{test.intro}</p>

                            {last && band ? (
                                <div className={`text-xs px-3 py-2 rounded-lg border mb-3 ${TONE_CLASS[band.tone]}`}>
                                    Последний: <b>{last.score}</b>/{test.maxScore} · {band.label}
                                    <span className="opacity-70"> · {new Date(last.date).toLocaleDateString('ru-RU')}</span>
                                </div>
                            ) : (
                                <div className="text-xs text-gray-600 mb-3">Ещё не проходил</div>
                            )}

                            <button onClick={() => setRunning(test)}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-2.5 rounded-lg">
                                {last ? 'Пройти снова' : 'Пройти тест'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {results.length > 0 && (
                <div className="glass-card p-6 rounded-2xl mt-6">
                    <div className="flex items-baseline justify-between mb-4">
                        <h2 className="text-xl font-bold">История</h2>
                        <span className="text-xs text-gray-500">{results.length} прохождений</span>
                    </div>
                    <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2">
                        {[...results].sort((a, b) => b.date.localeCompare(a.date)).map(r => {
                            const test = CLINICAL_TESTS.find(t => t.id === r.testId);
                            const band = test ? bandFor(test, r.score) : null;
                            return (
                                <div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--bg-input)] px-3 py-2 rounded-lg border border-[var(--border)]">
                                    <span className="text-sm text-gray-300 flex-1 min-w-[140px]">{test?.short ?? r.testId}</span>
                                    <span className="text-xs text-gray-500 tabular-nums">
                                        {new Date(r.date).toLocaleDateString('ru-RU')}
                                    </span>
                                    <span className="text-sm font-bold text-white tabular-nums">
                                        {r.score}<span className="text-gray-600">/{test?.maxScore ?? '—'}</span>
                                    </span>
                                    {band && <span className={`text-xs px-2 py-0.5 rounded-full border ${TONE_CLASS[band.tone]}`}>{band.label}</span>}
                                </div>
                            );
                        })}
                    </div>
                    <button
                        onClick={() => { if (confirm('Очистить историю клинических тестов?')) setClinicalResults([]); }}
                        className="mt-4 text-xs text-gray-500 hover:text-red-400">
                        Очистить историю
                    </button>
                </div>
            )}
        </div>
    );
}
