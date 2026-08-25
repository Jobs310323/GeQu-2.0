import type { RavenCell, RavenItem, RavenShape } from './types';
import { AGE_BRACKETS, scoreAgainstNorm } from '../norms';

const SHAPES: RavenShape[] = ['circle', 'square', 'triangle', 'diamond', 'star', 'hexagon'];

function pick3Shapes(rng: () => number): RavenShape[] {
    const pool = [...SHAPES];
    const out: RavenShape[] = [];
    for (let i = 0; i < 3; i++) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    return out;
}

/** The rule matrix a solved item follows: shape by row, count by column, and
 *  — from tier 2 and 3 — fill/rotation derived from both, so the missing
 *  cell has exactly one answer consistent with every row and column. */
function ruleCell(row: number, col: number, tier: 1 | 2 | 3, shapes: RavenShape[]): RavenCell {
    return {
        shape: shapes[row],
        count: (col + 1) as 1 | 2 | 3,
        filled: tier >= 2 ? (row + col) % 2 === 0 : true,
        rotation: tier >= 3 ? ((row + col) % 3) * 30 : 0,
    };
}

function cellKey(c: RavenCell): string {
    return `${c.shape}|${c.count}|${c.filled}|${c.rotation}`;
}

function mulberry32(seed: number): () => number {
    return function () {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function buildDistractors(correct: RavenCell, tier: 1 | 2 | 3, shapes: RavenShape[], rng: () => number, need: number): RavenCell[] {
    const seen = new Set([cellKey(correct)]);
    const out: RavenCell[] = [];
    const mutators: Array<() => RavenCell> = [
        () => ({ ...correct, shape: shapes[Math.floor(rng() * 3)] }),
        () => ({ ...correct, shape: SHAPES[Math.floor(rng() * SHAPES.length)] }),
        () => ({ ...correct, count: (Math.floor(rng() * 3) + 1) as 1 | 2 | 3 }),
        () => ({ ...correct, filled: !correct.filled }),
        () => ({ ...correct, rotation: (correct.rotation + 30 * (1 + Math.floor(rng() * 3))) % 180 }),
        () => ({ ...correct, shape: shapes[Math.floor(rng() * 3)], count: (Math.floor(rng() * 3) + 1) as 1 | 2 | 3 }),
    ];
    let guard = 0;
    while (out.length < need && guard < 200) {
        guard++;
        const active = tier === 1 ? mutators.slice(0, 3) : tier === 2 ? mutators.slice(0, 4) : mutators;
        const candidate = active[Math.floor(rng() * active.length)]();
        const key = cellKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(candidate);
    }
    return out;
}

/** Deterministic per-item generation (seeded by item index) so a given
 *  question is stable across re-renders within one attempt. */
function buildItem(index: number): RavenItem {
    const rng = mulberry32(index * 2654435761);
    const tier: 1 | 2 | 3 = index < 12 ? 1 : index < 22 ? 2 : 3;
    const shapes = pick3Shapes(rng);
    const grid: RavenCell[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
        if (r === 2 && c === 2) continue;
        grid.push(ruleCell(r, c, tier, shapes));
    }
    const correct = ruleCell(2, 2, tier, shapes);
    const distractors = buildDistractors(correct, tier, shapes, rng, 7);
    const options = [correct, ...distractors];
    // Fisher-Yates with the same seeded rng, tracking where the correct one lands.
    for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
    }
    const correctIndex = options.findIndex(o => cellKey(o) === cellKey(correct));
    return { id: index, tier, grid, options, correctIndex };
}

export const RAVEN_ITEM_COUNT = 32;

export function generateRavenBank(): RavenItem[] {
    return Array.from({ length: RAVEN_ITEM_COUNT }, (_, i) => buildItem(i));
}

/** Approximate norms: mean/sd as a fraction of items correct, mildly lower
 *  for older brackets. Illustrative, not a validated clinical norm. */
const RAVEN_NORM_FRACTIONS: { mean: number; sd: number }[] = [
    { mean: 0.62, sd: 0.18 }, // ≤17
    { mean: 0.72, sd: 0.15 }, // 18-25
    { mean: 0.70, sd: 0.15 }, // 26-35
    { mean: 0.66, sd: 0.16 }, // 36-50
    { mean: 0.60, sd: 0.17 }, // 51-65
    { mean: 0.52, sd: 0.18 }, // 65+
];

export function scoreRaven(correctCount: number, ageBracketIndex: number) {
    const norm = RAVEN_NORM_FRACTIONS[ageBracketIndex] ?? RAVEN_NORM_FRACTIONS[2];
    const meanRaw = norm.mean * RAVEN_ITEM_COUNT;
    const sdRaw = norm.sd * RAVEN_ITEM_COUNT;
    return scoreAgainstNorm(correctCount, meanRaw, sdRaw);
}

export { AGE_BRACKETS };
