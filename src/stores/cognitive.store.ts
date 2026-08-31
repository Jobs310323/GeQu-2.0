import { create } from 'zustand';
import type { TestResult, ClinicalResult, CbtRecord, CircleItem, UnlockedAchievements } from '../types/domain';
import { hydrate, persistSlices } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Everything measured about thinking: cognitive exercise attempts, screening
// questionnaires, CBT thought records, and the circles-of-control exercise.
//
// Phase 9 splits the exercise half into Train / Assess / Profile and gives every
// result a real envelope (normalisation, percentile, reference population).
// Until then `TestResult.value` is a raw per-exercise score with no shared unit.

type CognitiveState = {
    results: TestResult[];
    achievements: UnlockedAchievements;
    clinical: ClinicalResult[];
    cbt: CbtRecord[];
    circles: CircleItem[];
    setResults: Setter<TestResult[]>;
    setAchievements: Setter<UnlockedAchievements>;
    setClinical: Setter<ClinicalResult[]>;
    setCbt: Setter<CbtRecord[]>;
    setCircles: Setter<CircleItem[]>;
};

export const useCognitive = create<CognitiveState>()(set => ({
    results: hydrate<TestResult[]>('tests', []),
    achievements: hydrate<UnlockedAchievements>('ach', []),
    clinical: hydrate<ClinicalResult[]>('clinical', []),
    cbt: hydrate<CbtRecord[]>('cbt', []),
    circles: hydrate<CircleItem[]>('circles', []),
    setResults: next => set(s => ({ results: resolve(next, s.results) })),
    setAchievements: next => set(s => ({ achievements: resolve(next, s.achievements) })),
    setClinical: next => set(s => ({ clinical: resolve(next, s.clinical) })),
    setCbt: next => set(s => ({ cbt: resolve(next, s.cbt) })),
    setCircles: next => set(s => ({ circles: resolve(next, s.circles) })),
}));

persistSlices(useCognitive, {
    tests: s => s.results,
    ach: s => s.achievements,
    clinical: s => s.clinical,
    cbt: s => s.cbt,
    circles: s => s.circles,
});

export const selectResults = (s: CognitiveState) => s.results;
export const selectAchievements = (s: CognitiveState) => s.achievements;
