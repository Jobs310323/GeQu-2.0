import { scoreAgainstNorm } from '../norms';

// Own neutral 15-word list (not the copyrighted standardized Rey list) —
// concrete, unrelated, similar-frequency Russian nouns, per the RAVLT format.
export const RAVLT_WORDS = [
    'барабан', 'занавес', 'вишня', 'колокол', 'корзина',
    'скрипка', 'облако', 'песок', 'фонарь', 'молоток',
    'ковёр', 'зеркало', 'тропа', 'сахар', 'якорь',
];

function normalize(word: string): string {
    return word.trim().toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
}

/** Free-recall input (words separated by spaces/commas/newlines) scored against
 *  the target list. Extra intrusions are ignored, not penalized — RAVLT scores
 *  correct recall, not intrusion rate. */
export function scoreRecall(input: string): { count: number; words: Set<string> } {
    const target = new Set(RAVLT_WORDS.map(normalize));
    const said = input.split(/[\s,;]+/).map(normalize).filter(Boolean);
    const matched = new Set(said.filter(w => target.has(w)));
    return { count: matched.size, words: matched };
}

/** Approximate delayed-recall norms (out of 15), mildly lower for older brackets. */
const RAVLT_DELAYED_NORMS: { mean: number; sd: number }[] = [
    { mean: 9.5, sd: 2.8 }, { mean: 11, sd: 2.5 }, { mean: 10.3, sd: 2.6 },
    { mean: 9.2, sd: 2.7 }, { mean: 8.0, sd: 2.8 }, { mean: 6.5, sd: 2.9 },
];

export function scoreDelayed(count: number, ageBracketIndex: number) {
    const norm = RAVLT_DELAYED_NORMS[ageBracketIndex] ?? RAVLT_DELAYED_NORMS[2];
    return scoreAgainstNorm(count, norm.mean, norm.sd);
}
