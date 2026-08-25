import { scoreAgainstNorm } from '../norms';

export type DigitSpanPart = 'forward' | 'backward';

export const MAX_LENGTH = 9;
export const TRIALS_PER_LENGTH = 2;

export function generateSequence(length: number): number[] {
    const seq: number[] = [];
    for (let i = 0; i < length; i++) {
        let d: number;
        do { d = Math.floor(Math.random() * 10); } while (seq.length > 0 && d === seq[seq.length - 1]);
        seq.push(d);
    }
    return seq;
}

export function parseDigits(raw: string): number[] {
    return raw.replace(/[^0-9]/g, '').split('').filter(Boolean).map(Number);
}

export function checkAnswer(sequence: number[], input: number[], part: DigitSpanPart): boolean {
    const expected = part === 'backward' ? [...sequence].reverse() : sequence;
    return expected.length === input.length && expected.every((d, i) => d === input[i]);
}

/** Approximate norms for (forward span + backward span), mildly lower with age. */
const DIGITSPAN_NORMS: { mean: number; sd: number }[] = [
    { mean: 10.5, sd: 2.6 }, { mean: 12, sd: 2.4 }, { mean: 11.5, sd: 2.4 },
    { mean: 10.8, sd: 2.5 }, { mean: 9.8, sd: 2.6 }, { mean: 8.5, sd: 2.7 },
];

export function scoreDigitSpan(forwardSpan: number, backwardSpan: number, ageBracketIndex: number) {
    const norm = DIGITSPAN_NORMS[ageBracketIndex] ?? DIGITSPAN_NORMS[2];
    return scoreAgainstNorm(forwardSpan + backwardSpan, norm.mean, norm.sd);
}
