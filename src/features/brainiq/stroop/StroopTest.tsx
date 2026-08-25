import { useRef, useState } from 'react';
import {
    STROOP_COLORS, STROOP_STAGES, ITEMS_PER_STAGE, STAGE_LABEL,
    generateStage, summarizeStage, interferenceIndex, interpretInterference,
    type StroopStage, type StroopStimulus, type StageResult,
} from './logic';
import { saveBrainIqResult } from '../types';

type Phase = 'intro' | 'running' | 'done';

export function StroopTest({ setBrainIqResults }: any) {
    const [phase, setPhase] = useState<Phase>('intro');
    const [stageIdx, setStageIdx] = useState(0);
    const [items, setItems] = useState<StroopStimulus[]>([]);
    const [itemIdx, setItemIdx] = useState(0);
    const rts = useRef<number[]>([]);
    const corrects = useRef<boolean[]>([]);
    const shownAt = useRef(0);
    const [results, setResults] = useState<Partial<Record<StroopStage, StageResult>>>({});

    function beginStage(idx: number) {
        const stage = STROOP_STAGES[idx];
        setItems(generateStage(stage));
        setItemIdx(0);
        rts.current = [];
        corrects.current = [];
        shownAt.current = Date.now();
        setStageIdx(idx);
        setPhase('running');
    }

    function finishAll(lastResults: Partial<Record<StroopStage, StageResult>>) {
        const congruent = lastResults.congruent!;
        const incongruent = lastResults.incongruent!;
        const dots = lastResults.dots!;
        const idx = interferenceIndex(incongruent.avgMs, congruent.avgMs);
        saveBrainIqResult(setBrainIqResults, {
            testId: 'stroop',
            raw: {
                dotsAvgMs: dots.avgMs, dotsErrors: dots.total - dots.correct,
                congruentAvgMs: congruent.avgMs, congruentErrors: congruent.total - congruent.correct,
                incongruentAvgMs: incongruent.avgMs, incongruentErrors: incongruent.total - incongruent.correct,
            },
            meta: { interferenceIndex: idx, interpretation: interpretInterference(idx) },
        });
        setPhase('done');
    }

    function answer(colorName: string) {
        const rt = Date.now() - shownAt.current;
        rts.current.push(rt);
        corrects.current.push(colorName === items[itemIdx].ink);

        if (itemIdx + 1 >= items.length) {
            const stage = STROOP_STAGES[stageIdx];
            const summary = summarizeStage(rts.current, corrects.current);
            const nextResults = { ...results, [stage]: summary };
            setResults(nextResults);
            if (stageIdx + 1 >= STROOP_STAGES.length) {
                finishAll(nextResults);
            } else {
                beginStage(stageIdx + 1);
            }
        } else {
            setItemIdx(i => i + 1);
            shownAt.current = Date.now();
        }
    }

    if (phase === 'intro') {
        return (
            <div className="gq-glass p-8 rounded-2xl flex flex-col items-center text-center gap-4">
                <h3 className="gq-heading text-lg font-bold">Тест Струпа</h3>
                <p className="text-sm gq-muted max-w-md">
                    Три этапа по {ITEMS_PER_STAGE} проб: цвет точек, цвет слова (совпадает со значением), затем цвет шрифта — значение слова игнорируйте.
                </p>
                <button onClick={() => beginStage(0)} className="gq-btn px-8 py-3 rounded-lg font-bold mt-2">Начать</button>
            </div>
        );
    }

    if (phase === 'running') {
        const stage = STROOP_STAGES[stageIdx];
        const item = items[itemIdx];
        return (
            <div className="gq-glass p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-6 text-sm gq-muted">
                    <span>{STAGE_LABEL[stage]} · этап {stageIdx + 1}/3</span>
                    <span>{itemIdx + 1} / {items.length}</span>
                </div>
                <div className="flex items-center justify-center py-10 mb-8">
                    {stage === 'dots'
                        ? <div className="w-24 h-24 rounded-full" style={{ background: STROOP_COLORS.find(c => c.name === item.ink)!.hex }} />
                        : <div className="text-6xl font-extrabold" style={{ color: STROOP_COLORS.find(c => c.name === item.ink)!.hex }}>{item.word}</div>}
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                    {STROOP_COLORS.map(c => (
                        <button key={c.name} onClick={() => answer(c.name)}
                            className="px-5 py-2.5 rounded-xl border border-[var(--border)] hover:bg-white/10 text-sm font-medium">
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    const dots = results.dots!, congruent = results.congruent!, incongruent = results.incongruent!;
    const idx = interferenceIndex(incongruent.avgMs, congruent.avgMs);
    return (
        <div className="gq-glass p-8 rounded-2xl text-center">
            <h3 className="gq-heading text-lg font-bold mb-4">Результат</h3>
            <div className="grid grid-cols-3 gap-3 mb-5 max-w-lg mx-auto text-sm">
                {[['Точки', dots], ['Конгруэнтно', congruent], ['Неконгруэнтно', incongruent]].map(([label, r]: any) => (
                    <div key={label} className="rounded-xl p-3 bg-[var(--bg-input)] border border-[var(--border)]">
                        <div className="gq-muted text-xs mb-1">{label}</div>
                        <div className="font-bold">{r.avgMs} мс</div>
                        <div className="gq-muted text-xs">Ошибок: {r.total - r.correct}/{r.total}</div>
                    </div>
                ))}
            </div>
            <div className="text-4xl font-bold mb-2" style={{ color: 'var(--gq-grad-a, #7c6cf6)' }}>{idx}%</div>
            <div className="text-sm gq-muted mb-6">Интерференционный индекс · {interpretInterference(idx)}</div>
            <button onClick={() => beginStage(0)} className="gq-btn px-6 py-2.5 rounded-lg font-bold">Пройти снова</button>
        </div>
    );
}
