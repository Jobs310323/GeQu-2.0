import { scoreAgainstNorm } from '../norms';

export const SDMT_SYMBOLS = ['△', '◇', '☆', '◻', '✦', '⊕', '∞', '♪', '☘'];
export const SDMT_DURATION_MS = 90 * 1000;
const SEQUENCE_LENGTH = 200; // comfortably more items than can be answered in 90s

/** Shuffles digits 1-9 onto the fixed symbol set — a new key each attempt,
 *  held constant for the whole 90 seconds, as the SDMT protocol requires. */
export function generateKey(): Record<string, number> {
    const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = digits.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [digits[i], digits[j]] = [digits[j], digits[i]];
    }
    const key: Record<string, number> = {};
    SDMT_SYMBOLS.forEach((s, i) => { key[s] = digits[i]; });
    return key;
}

export function generateSequence(): string[] {
    return Array.from({ length: SEQUENCE_LENGTH }, () => SDMT_SYMBOLS[Math.floor(Math.random() * SDMT_SYMBOLS.length)]);
}

/** Approximate norms for correct answers in 90s, mildly lower with age. */
const SDMT_NORMS: { mean: number; sd: number }[] = [
    { mean: 52, sd: 11 }, { mean: 58, sd: 10 }, { mean: 55, sd: 10 },
    { mean: 50, sd: 10 }, { mean: 44, sd: 10 }, { mean: 36, sd: 10 },
];

export function scoreSdmt(correct: number, ageBracketIndex: number) {
    const norm = SDMT_NORMS[ageBracketIndex] ?? SDMT_NORMS[2];
    return scoreAgainstNorm(correct, norm.mean, norm.sd);
}
