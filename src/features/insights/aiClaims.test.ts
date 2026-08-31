import { describe, it, expect } from 'vitest';
import { CLAIM_SYSTEM_PROMPT, isAllowedClaim, stripCausalLanguage } from './aiClaims';

/**
 * The model is the one component here that can say anything at all, and it has
 * been trained on text where "your poor sleep is driving your low mood" reads
 * as ordinary advice. Here that would be a claim about a specific person's
 * health, drawn from a handful of self-rated numbers, that they might act on.
 *
 * The prompt asks for the right behaviour. These tests cover what happens when
 * asking is not enough.
 */

describe('the system prompt', () => {
    it('names all four claim types', () => {
        for (const claim of ['observed', 'associated', 'inferred', 'uncertain']) {
            expect(CLAIM_SYSTEM_PROMPT).toContain(claim);
        }
    });

    it('forbids causal assertion with a concrete example', () => {
        // A rule stated abstractly is easy to comply with in the wrong way.
        expect(CLAIM_SYSTEM_PROMPT).toMatch(/Сон улучшает фокус.*запрещено/s);
    });

    it('forbids medical framing', () => {
        expect(CLAIM_SYSTEM_PROMPT).toMatch(/диагноз/i);
    });

    it('says that "not enough data" is a complete answer', () => {
        expect(CLAIM_SYSTEM_PROMPT).toMatch(/рано судить|данных не хватает/i);
    });
});

describe('isAllowedClaim', () => {
    it('accepts the four types', () => {
        for (const c of ['observed', 'associated', 'inferred', 'uncertain']) {
            expect(isAllowedClaim(c)).toBe(true);
        }
    });

    it('rejects anything else, including a plausible-looking invention', () => {
        expect(isAllowedClaim('proven')).toBe(false);
        expect(isAllowedClaim('diagnosed')).toBe(false);
        expect(isAllowedClaim('caused')).toBe(false);
        expect(isAllowedClaim(undefined)).toBe(false);
        expect(isAllowedClaim(42)).toBe(false);
    });
});

describe('stripCausalLanguage', () => {
    it('rewrites an assertion of cause into co-occurrence', () => {
        const { text, changed } = stripCausalLanguage('Сон улучшает твой фокус.');
        expect(changed).toBe(true);
        expect(text).not.toMatch(/улучшает/);
        expect(text).toContain('совпадает с');
    });

    it.each([
        ['Плохой сон ухудшает настроение.', /ухудшает/],
        ['Стресс приводит к срывам.', /приводит к/],
        ['Недосып вызывает раздражительность.', /вызывает/],
        ['Спорт влияет на фокус.', /влияет на/],
        ['Ты устал из-за недосыпа.', /из-за/],
    ])('rewrites %s', (input, pattern) => {
        expect(stripCausalLanguage(input).text).not.toMatch(pattern);
    });

    it('leaves a correctly-hedged sentence alone', () => {
        // Mangling good text is its own failure — a garbled sentence is not
        // safer than a clear one, just harder to judge.
        const good = 'В дни с более долгим сном фокус в среднем был выше.';
        const { text, changed } = stripCausalLanguage(good);
        expect(text).toBe(good);
        expect(changed).toBe(false);
    });

    it('flags medical framing rather than silently rewriting it', () => {
        // Rewriting would hide that the model went somewhere it should not.
        // The caller decides what to do; it must at least know.
        const { flagged } = stripCausalLanguage('Это симптом расстройства внимания.');
        expect(flagged).toContain('симптом');
        expect(flagged.some(f => f.startsWith('расстройств'))).toBe(true);
    });

    it('reports nothing flagged for ordinary text', () => {
        expect(stripCausalLanguage('За 30 дней ты оценил 14.').flagged).toEqual([]);
    });

    it('handles an empty string', () => {
        expect(stripCausalLanguage('')).toEqual({ text: '', changed: false, flagged: [] });
    });
});
