import type { ClaimType } from './types';

// The constraint placed on anything the model says about a user's own data.
//
// The local engine (`engine.ts`) can only produce `observed` and `associated`,
// because that is all arithmetic over someone's logs can support. A language
// model will happily produce more: it is trained on text where "your poor sleep
// is driving your low mood" is a normal sentence, and it has no way to know
// that here it would be a claim about a specific person's health made from
// eleven self-rated numbers.
//
// So the model is given the vocabulary explicitly, told which claims it may
// make, and its output is checked. Prompting alone is not a guarantee — hence
// `stripCausalLanguage`, which runs on what comes back.

/** Prepended to every prompt that interprets the user's own data. */
export const CLAIM_SYSTEM_PROMPT = `
Ты помогаешь человеку читать его собственные записи о себе. Это не медицинская
консультация и не диагностика.

Каждое утверждение относи ровно к одному типу и помечай его:
- observed — то, что прямо видно в данных ("отмечено 14 дней из 30").
- associated — два показателя менялись вместе. Ничего о причине.
- inferred — твоё прочтение сверх данных. Обязательно назови его предположением.
- uncertain — данных не хватает. Сформулируй как вопрос, а не как вывод.

Правила, которые нельзя нарушать:
1. Никогда не утверждай причину. "Сон улучшает фокус" — запрещено. "В дни с
   более долгим сном фокус в среднем был выше" — допустимо.
2. Никогда не используй медицинский язык: диагноз, симптом, расстройство,
   норма, патология, дефицит.
3. Если данных мало — скажи об этом прямо и не делай вывод. "Пока рано судить"
   это полноценный ответ.
4. Всегда указывай, на скольких днях основано утверждение.
`.trim();

/** Claims the model is permitted to make. */
export const ALLOWED_CLAIMS: readonly ClaimType[] = ['observed', 'associated', 'inferred', 'uncertain'];

export function isAllowedClaim(value: unknown): value is ClaimType {
    return typeof value === 'string' && (ALLOWED_CLAIMS as readonly string[]).includes(value);
}

/**
 * Phrases that assert cause, and what to say instead.
 *
 * Deliberately a small, specific list rather than a broad filter. Mangling
 * legitimate text to catch a hypothetical is its own failure: a garbled
 * sentence is not safer than a clear one, it is just harder to judge.
 */
/* `\b` is useless here: JavaScript defines a word boundary against
   `[A-Za-z0-9_]`, so every Cyrillic letter counts as a non-word character and
   `/\bулучшает\b/` never matches Russian text at all. Unicode letter
   lookarounds under the `u` flag are the working equivalent. */
const edge = (word: string) => new RegExp(`(?<!\\p{L})${word}(?!\\p{L})`, 'giu');

const CAUSAL_PATTERNS: readonly [RegExp, string][] = [
    [edge('улучшает'), 'совпадает с более высоким'],
    [edge('ухудшает'), 'совпадает с более низким'],
    [edge('приводит к'), 'совпадает с'],
    [edge('вызывает'), 'совпадает с'],
    [edge('влияет на'), 'связан с'],
    [edge('из-за'), 'вместе с'],
];

/** Medical framing this app has no standing to use. */
const MEDICAL_PATTERNS: readonly RegExp[] = [
    /(?<!\p{L})диагноз\p{L}*/giu,
    /(?<!\p{L})симптом\p{L}*/giu,
    /(?<!\p{L})расстройств\p{L}*/giu,
    /(?<!\p{L})патологи\p{L}*/giu,
    /(?<!\p{L})норм[аы](?!\p{L})/giu,
];

/**
 * Rewrites causal assertions into co-occurrence, and flags medical language.
 *
 * The second line of defence. The prompt asks for the right thing; this checks
 * what actually arrived, because a model that has been asked nicely is not a
 * guarantee and the cost of one bad sentence here is a user acting on it.
 */
export function stripCausalLanguage(text: string): { text: string; changed: boolean; flagged: string[] } {
    let out = text;
    let changed = false;

    for (const [pattern, replacement] of CAUSAL_PATTERNS) {
        // Compare rather than `test()` first: a /g regex carries `lastIndex`
        // between calls, so testing then replacing starts the replace from the
        // wrong offset and leaves the pattern primed to miss on the next call.
        const next = out.replace(pattern, replacement);
        if (next !== out) { out = next; changed = true; }
    }

    const flagged = MEDICAL_PATTERNS
        .flatMap(p => out.match(p) ?? [])
        .map(m => m.toLowerCase());

    return { text: out, changed, flagged: [...new Set(flagged)] };
}
