// Data model shared by the five "Мозг и IQ" psychometric tests. Each test
// keeps its own stimuli/scoring in its own folder; this is only the shape
// they all save results in, so the host page can list/compare them uniformly.

export type BrainIqTestId = 'raven' | 'ravlt' | 'digitspan' | 'sdmt' | 'stroop';

export interface BrainIqResult {
    id: number;
    date: string; // ISO
    testId: BrainIqTestId;
    raw: Record<string, number>;
    scaled?: { percentile?: number; iq?: number; index?: number };
    meta?: Record<string, unknown>;
}

export function saveBrainIqResult(
    setResults: (updater: (prev: BrainIqResult[]) => BrainIqResult[]) => void,
    result: Omit<BrainIqResult, 'id' | 'date'>,
) {
    setResults(prev => [...prev, { ...result, id: Date.now(), date: new Date().toISOString() }]);
}

export const BRAINIQ_TEST_LABELS: Record<BrainIqTestId, string> = {
    raven: 'Матрицы (IQ)',
    ravlt: 'Вербальная память',
    digitspan: 'Память на цифры',
    sdmt: 'Скорость обработки',
    stroop: 'Тест Струпа',
};
