// Data model for the "Снеговик" (Snowman) daily-balance tracker.
// Three spheres — intellect, emotion, body — stack into a snowman whose
// circles grow with the points earned in each sphere today.

import type { NonEmptyArray } from '../../lib/nonEmpty';

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

export const SPHERES: NonEmptyArray<{ id: Sphere; label: string; icon: string; color: string }> = [
    // A lightbulb rather than a brain: U+1F9E0 is Unicode 9 and renders as a
    // tofu box on the Windows builds this app targets. `npm run check:emoji`
    // has flagged it since Phase 5 but was never wired into CI; Phase 11 wires
    // it in, so it is fixed here rather than the gate weakened to accept it.
    // (The codepoint is named, not written — the checker reads raw text.)
    { id: 'intellect', label: 'Интеллект', icon: '💡', color: '#6366f1' },
    { id: 'emotion', label: 'Эмоции', icon: '❤️', color: '#ec4899' },
    { id: 'body', label: 'Тело', icon: '💪', color: '#22c55e' },
];

export const DIFFICULTY_OPTIONS: { id: Difficulty; label: string; multiplier: number }[] = [
    { id: 1, label: 'Легко ×1', multiplier: 1 },
    { id: 2, label: 'Средне ×1.5', multiplier: 1.5 },
    { id: 3, label: 'Сложно ×2', multiplier: 2 },
];

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = { 1: 1, 2: 1.5, 3: 2 };
