import type { CognitiveEngine } from './types';

// The twelve exercises, described.
//
// `plausibleRange` is what the score can realistically span for a general adult
// on a phone or laptop, used only to put a first attempt on a 0–100 scale before
// personal history exists. It is a display convenience, NOT a norm: it says
// nothing about where a person stands relative to anyone else, and the moment
// enough of their own attempts exist the range stops being used (see
// `scoring.ts`).
//
// `limitations` are shown next to results. Every one of these is real and was
// written by reading what the exercise actually does — a caveat that is vague
// enough to apply to anything ("results may vary") is worse than none, because
// it teaches the user to skip the caveats that matter.

export const ENGINES: readonly CognitiveEngine[] = [
    {
        id: 'schulte',
        labelKey: 'brain:engine.schulte.label',
        version: '1.0.0',
        domain: 'attention',
        mode: 'assess',
        unitKey: 'brain:unit.sec',
        lowerIsBetter: true,
        plausibleRange: [15, 90],
        limitationKeys: [
            'brain:engine.schulte.limitations.0',
            'brain:engine.schulte.limitations.1',
        ],
    },
    {
        id: 'reaction',
        labelKey: 'brain:engine.reaction.label',
        version: '1.0.0',
        domain: 'processing',
        mode: 'assess',
        unitKey: 'brain:unit.ms',
        lowerIsBetter: true,
        plausibleRange: [150, 600],
        limitationKeys: [
            'brain:engine.reaction.limitations.0',
            'brain:engine.reaction.limitations.1',
        ],
    },
    {
        id: 'tmt',
        labelKey: 'brain:engine.tmt.label',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unitKey: 'brain:unit.sec',
        lowerIsBetter: true,
        plausibleRange: [15, 120],
        limitationKeys: [
            'brain:engine.tmt.limitations.0',
            'brain:engine.tmt.limitations.1',
        ],
    },
    {
        id: 'stroop',
        labelKey: 'brain:engine.stroop.label',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unitKey: 'brain:unit.points',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitationKeys: [
            'brain:engine.stroop.limitations.0',
            'brain:engine.stroop.limitations.1',
        ],
    },
    {
        id: 'digitspan',
        labelKey: 'brain:engine.digitspan.label',
        version: '1.0.0',
        domain: 'memory',
        mode: 'assess',
        unitKey: 'brain:unit.level',
        lowerIsBetter: false,
        plausibleRange: [3, 12],
        limitationKeys: [
            'brain:engine.digitspan.limitations.0',
            'brain:engine.digitspan.limitations.1',
        ],
    },
    {
        id: 'corsi',
        labelKey: 'brain:engine.corsi.label',
        version: '1.0.0',
        domain: 'memory',
        mode: 'assess',
        unitKey: 'brain:unit.span',
        lowerIsBetter: false,
        plausibleRange: [2, 10],
        limitationKeys: [
            'brain:engine.corsi.limitations.0',
            'brain:engine.corsi.limitations.1',
        ],
    },
    {
        id: 'nback',
        labelKey: 'brain:engine.nback.label',
        version: '1.0.0',
        domain: 'memory',
        mode: 'train',
        unitKey: 'brain:unit.accuracy',
        lowerIsBetter: false,
        plausibleRange: [0, 100],
        limitationKeys: [
            'brain:engine.nback.limitations.0',
            'brain:engine.nback.limitations.1',
        ],
    },
    {
        id: 'gonogo',
        labelKey: 'brain:engine.gonogo.label',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unitKey: 'brain:unit.points',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitationKeys: [
            'brain:engine.gonogo.limitations.0',
            'brain:engine.gonogo.limitations.1',
        ],
    },
    {
        id: 'arithmetic',
        labelKey: 'brain:engine.arithmetic.label',
        version: '1.0.0',
        domain: 'processing',
        mode: 'train',
        unitKey: 'brain:unit.points',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitationKeys: [
            'brain:engine.arithmetic.limitations.0',
        ],
    },
    {
        id: 'switching',
        labelKey: 'brain:engine.switching.label',
        version: '1.0.0',
        domain: 'executive',
        mode: 'train',
        unitKey: 'brain:unit.points',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitationKeys: [
            'brain:engine.switching.limitations.0',
        ],
    },
] as const;

const BY_ID = new Map(ENGINES.map(e => [e.id, e]));

export function engineFor(id: string): CognitiveEngine | undefined {
    return BY_ID.get(id);
}

/** Exercises grouped for the Train / Assess split. */
export const assessments = (): readonly CognitiveEngine[] => ENGINES.filter(e => e.mode === 'assess');
export const drills = (): readonly CognitiveEngine[] => ENGINES.filter(e => e.mode === 'train');
