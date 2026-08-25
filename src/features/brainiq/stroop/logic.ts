export const STROOP_COLORS = [
    { name: 'КРАСНЫЙ', hex: '#FF5555' },
    { name: 'ЗЕЛЁНЫЙ', hex: '#50FA7B' },
    { name: 'СИНИЙ', hex: '#8BE9FD' },
    { name: 'ЖЁЛТЫЙ', hex: '#F1FA8C' },
];

export type StroopStage = 'dots' | 'congruent' | 'incongruent';
export const STROOP_STAGES: StroopStage[] = ['dots', 'congruent', 'incongruent'];
export const ITEMS_PER_STAGE = 16;

export interface StroopStimulus { word?: string; ink: string }

export function generateStage(stage: StroopStage): StroopStimulus[] {
    return Array.from({ length: ITEMS_PER_STAGE }, () => {
        const ink = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)].name;
        if (stage === 'dots') return { ink };
        if (stage === 'congruent') return { word: ink, ink };
        let wordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
        while (STROOP_COLORS[wordIdx].name === ink) wordIdx = Math.floor(Math.random() * STROOP_COLORS.length);
        return { word: STROOP_COLORS[wordIdx].name, ink };
    });
}

export interface StageResult { correct: number; total: number; avgMs: number; errorMs: number[] }

export function summarizeStage(rtsMs: number[], corrects: boolean[]): StageResult {
    const correct = corrects.filter(Boolean).length;
    const avgMs = rtsMs.length ? Math.round(rtsMs.reduce((a, b) => a + b, 0) / rtsMs.length) : 0;
    return { correct, total: corrects.length, avgMs, errorMs: [] };
}

export function interferenceIndex(incongruentAvgMs: number, congruentAvgMs: number): number {
    return congruentAvgMs > 0 ? Math.round(((incongruentAvgMs - congruentAvgMs) / congruentAvgMs) * 100) : 0;
}

export function interpretInterference(index: number): string {
    if (index < 15) return 'Низкая интерференция — хороший когнитивный контроль';
    if (index < 35) return 'Типичная интерференция';
    if (index < 60) return 'Повышенная интерференция';
    return 'Выраженная интерференция';
}

export const STAGE_LABEL: Record<StroopStage, string> = {
    dots: 'Цвет точек',
    congruent: 'Цвет слова (конгруэнтно)',
    incongruent: 'Цвет шрифта, игнорируя слово',
};
