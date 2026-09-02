import { describe, it, expect } from 'vitest';
import { claimSystemPrompt, isAllowedClaim, stripCausalLanguage } from './aiClaims';
import { SUPPORTED_LOCALES } from '../../i18n/locale';

/**
 * The model is the one component here that can say anything at all, and it has
 * been trained on text where "your poor sleep is driving your low mood" reads
 * as ordinary advice. Here that would be a claim about a specific person's
 * health, drawn from a handful of self-rated numbers, that they might act on.
 *
 * The prompt asks for the right behaviour. These tests cover what happens when
 * asking is not enough — in both locales, since the model answers in whichever
 * language it was prompted in.
 */

describe('the system prompt', () => {
    it('names all four claim types, in every locale', () => {
        for (const locale of SUPPORTED_LOCALES) {
            for (const claim of ['observed', 'associated', 'inferred', 'uncertain']) {
                expect(claimSystemPrompt(locale)).toContain(claim);
            }
        }
    });

    it('forbids causal assertion with a concrete example, in every locale', () => {
        // A rule stated abstractly is easy to comply with in the wrong way.
        expect(claimSystemPrompt('ru')).toMatch(/Сон улучшает фокус.*запрещено/s);
        expect(claimSystemPrompt('en')).toMatch(/Sleep improves focus.*forbidden/s);
    });

    it('forbids medical framing, in every locale', () => {
        expect(claimSystemPrompt('ru')).toMatch(/диагноз/i);
        expect(claimSystemPrompt('en')).toMatch(/diagnosis/i);
    });

    it('says that "not enough data" is a complete answer, in every locale', () => {
        expect(claimSystemPrompt('ru')).toMatch(/рано судить|данных не хватает/i);
        expect(claimSystemPrompt('en')).toMatch(/too early|not enough data/i);
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
    it('rewrites an assertion of cause into co-occurrence, in Russian', () => {
        const { text, changed } = stripCausalLanguage('Сон улучшает твой фокус.', 'ru');
        expect(changed).toBe(true);
        expect(text).not.toMatch(/улучшает/);
        expect(text).toContain('совпадает с');
    });

    it('rewrites an assertion of cause into co-occurrence, in English', () => {
        const { text, changed } = stripCausalLanguage('Sleep improves your focus.', 'en');
        expect(changed).toBe(true);
        expect(text).not.toMatch(/\bimproves\b/);
        expect(text).toContain('co-occurs with');
    });

    it.each([
        ['Плохой сон ухудшает настроение.', /ухудшает/],
        ['Больше движения повышает энергию.', /повышает/],
        ['Стресс снижает концентрацию.', /снижает/],
        ['Стресс приводит к срывам.', /приводит к/],
        ['Недосып вызывает раздражительность.', /вызывает/],
        ['Спорт влияет на фокус.', /влияет на/],
        ['Ты устал из-за недосыпа.', /из-за/],
        ['Ты раздражён, потому что не выспался.', /потому что/],
        ['Медитация помогает тебе сосредоточиться.', /помогает тебе/],
    ])('rewrites %s (ru)', (input, pattern) => {
        expect(stripCausalLanguage(input, 'ru').text).not.toMatch(pattern);
    });

    it.each([
        ['Poor sleep worsens your mood.', /\bworsens\b/],
        ['More movement increases your energy.', /\bincreases\b/],
        ['Stress reduces concentration.', /\breduces\b/],
        ['Stress leads to burnout.', /leads to/],
        ['Sleep debt causes irritability.', /\bcauses\b/],
        ['A late night caused today\'s low focus.', /\bcaused\b/],
        ['Poor sleep is causing your low mood.', /\bcausing\b/],
        ['Exercise affects your focus.', /\baffects\b/],
        ['You are tired because of the late night.', /because of/],
        ['Your focus dropped due to poor sleep.', /due to/],
        ['Meditation helps you concentrate.', /helps you/],
    ])('rewrites %s (en)', (input, pattern) => {
        expect(stripCausalLanguage(input, 'en').text).not.toMatch(pattern);
    });

    it('never flags the bare noun "cause" — the association insight\'s own disclaimer ends in it', () => {
        // The exact sentence the association template produces (see
        // insights.json's `association` key). A filter that rewrote or flagged
        // this would teach the next author to delete the disclaimer to get
        // back to green, which defeats the whole point of having one.
        const disclaimer = 'That is a co-occurrence across days, not a proven cause.';
        const { text, changed, flagged } = stripCausalLanguage(disclaimer, 'en');
        expect(text).toBe(disclaimer);
        expect(changed).toBe(false);
        expect(flagged).toEqual([]);
    });

    it('leaves a correctly-hedged sentence alone, in Russian', () => {
        // Mangling good text is its own failure — a garbled sentence is not
        // safer than a clear one, just harder to judge.
        const good = 'В дни с более долгим сном фокус в среднем был выше.';
        const { text, changed } = stripCausalLanguage(good, 'ru');
        expect(text).toBe(good);
        expect(changed).toBe(false);
    });

    it('leaves a correctly-hedged sentence alone, in English', () => {
        const good = 'On days with more sleep, focus was higher on average.';
        const { text, changed } = stripCausalLanguage(good, 'en');
        expect(text).toBe(good);
        expect(changed).toBe(false);
    });

    it('flags medical framing rather than silently rewriting it, in Russian', () => {
        // Rewriting would hide that the model went somewhere it should not.
        // The caller decides what to do; it must at least know.
        const { flagged } = stripCausalLanguage('Это симптом расстройства внимания.', 'ru');
        expect(flagged).toContain('симптом');
        expect(flagged.some(f => f.startsWith('расстройств'))).toBe(true);
    });

    it('flags medical framing rather than silently rewriting it, in English', () => {
        const { flagged } = stripCausalLanguage('This looks like a symptom of an attention disorder.', 'en');
        expect(flagged).toContain('symptom');
        expect(flagged.some(f => f.startsWith('disorder'))).toBe(true);
    });

    it('reports nothing flagged for ordinary text, in either locale', () => {
        expect(stripCausalLanguage('За 30 дней ты оценил 14.', 'ru').flagged).toEqual([]);
        expect(stripCausalLanguage('You logged 14 of the last 30 days.', 'en').flagged).toEqual([]);
    });

    it('handles an empty string, in either locale', () => {
        expect(stripCausalLanguage('', 'ru')).toEqual({ text: '', changed: false, flagged: [] });
        expect(stripCausalLanguage('', 'en')).toEqual({ text: '', changed: false, flagged: [] });
    });
});
