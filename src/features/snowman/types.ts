// Data model for the "Снеговик" (Snowman) daily-balance tracker.
// Three spheres — intellect, emotion, body — stack into a snowman whose
// circles grow with the points earned in each sphere today.

import type { NonEmptyArray } from '../../lib/nonEmpty';
import type { TFunction } from 'i18next';

export type Sphere = 'intellect' | 'emotion' | 'body';

export type Difficulty = 1 | 2 | 3;

/** A user-defined chip ("ярлык") that activities of a day get created from. */
export interface ActivityLabel {
    id: string;
    label: string;
    sphere: Sphere;
    createdAt: string;
}

/** One logged activity inside a DayRecord. Denormalizes label/sphere off the
 *  chip so renaming or deleting a chip later never rewrites past history. */
export interface Activity {
    id: string;
    labelId: string;
    label: string;
    sphere: Sphere;
    minutes: number;
    difficulty: Difficulty;
    points: number;
    createdAt: string;
    updatedAt: string;
}

export interface DayRecord {
    date: string; // YYYY-MM-DD
    activities: Activity[];
    scores: { intellect: number; emotion: number; body: number };
    totalHarmony: number;
    isEdited: boolean;
    editHistory: { timestamp: string; changes: string }[];
    closedAt: string | null;
}

// `label` is deliberately not stored here: it used to be a hardcoded Russian
// string, and display text now comes from `track:snowman.sphere.*` /
// `track:snowman.difficulty.*` via the lookups below, keyed by the `id`
// (already a stable English-language code, not translated data).
export const SPHERES: NonEmptyArray<{ id: Sphere; icon: string; color: string }> = [
    // A lightbulb rather than a brain: U+1F9E0 is Unicode 9 and renders as a
    // tofu box on the Windows builds this app targets. `npm run check:emoji`
    // has flagged it since Phase 5 but was never wired into CI; Phase 11 wires
    // it in, so it is fixed here rather than the gate weakened to accept it.
    // (The codepoint is named, not written — the checker reads raw text.)
    { id: 'intellect', icon: '💡', color: '#6366f1' },
    { id: 'emotion', icon: '❤️', color: '#ec4899' },
    { id: 'body', icon: '💪', color: '#22c55e' },
];

export const DIFFICULTY_OPTIONS: { id: Difficulty; multiplier: number }[] = [
    { id: 1, multiplier: 1 },
    { id: 2, multiplier: 1.5 },
    { id: 3, multiplier: 2 },
];

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { 1: 1, 2: 1.5, 3: 2 };

type Translate = TFunction;

const SPHERE_KEY: Record<Sphere, string> = {
    intellect: 'track:snowman.sphere.intellect',
    emotion: 'track:snowman.sphere.emotion',
    body: 'track:snowman.sphere.body',
};

const DIFFICULTY_KEY: Record<Difficulty, string> = {
    1: 'track:snowman.difficulty.easy',
    2: 'track:snowman.difficulty.medium',
    3: 'track:snowman.difficulty.hard',
};

const BANNER_KEY: Record<Sphere, string> = {
    intellect: 'track:snowman.banner.intellect',
    emotion: 'track:snowman.banner.emotion',
    body: 'track:snowman.banner.body',
};

const RECOMMENDATION_KEY: Record<Sphere, string> = {
    intellect: 'track:snowman.analytics.recommendation.intellect',
    emotion: 'track:snowman.analytics.recommendation.emotion',
    body: 'track:snowman.analytics.recommendation.body',
};

export const sphereLabel = (id: Sphere, t: Translate): string => t(SPHERE_KEY[id]);
export const difficultyLabel = (id: Difficulty, t: Translate): string =>
    t(DIFFICULTY_KEY[id], { multiplier: DIFFICULTY_MULTIPLIER[id] });
export const sphereBanner = (id: Sphere, t: Translate): string => t(BANNER_KEY[id]);
export const sphereRecommendation = (id: Sphere, t: Translate): string => t(RECOMMENDATION_KEY[id]);
