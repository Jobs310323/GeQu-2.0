import type { ClaimType } from './types';
import type { Locale } from '../../i18n/locale';

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
// `stripCausalLanguage`, which runs on what comes back, in whichever language
// the model actually answered in. Both halves of this file are per-locale
// tables for exactly that reason: a guard that only recognises Russian causal
// language stops guarding the moment an English-locale user gets an English
// reply — the model does not stop overreaching just because it switched
// languages.

const CLAIM_SYSTEM_PROMPT_RU = `
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

const CLAIM_SYSTEM_PROMPT_EN = `
You are helping someone read their own self-tracked records. This is not
medical advice and not a diagnosis.

File every statement under exactly one type and label it:
- observed — what the data directly shows ("logged on 14 of 30 days").
- associated — two measures moved together. Nothing about cause.
- inferred — your own reading beyond the data. Always name it as a guess.
- uncertain — not enough data. Phrase it as a question, not a conclusion.

Rules that may not be broken:
1. Never assert cause. "Sleep improves focus" is forbidden. "On days with
   more sleep, focus was higher on average" is allowed.
2. Never use medical language: diagnosis, symptom, disorder, norm, pathology,
   deficit.
3. If there isn't enough data, say so plainly and draw no conclusion. "Too
   early to tell" is a complete answer.
4. Always state how many days the statement is based on.
`.trim();

/** Prepended to every prompt that interprets the user's own data. */
export function claimSystemPrompt(locale: Locale): string {
    return locale === 'ru' ? CLAIM_SYSTEM_PROMPT_RU : CLAIM_SYSTEM_PROMPT_EN;
}

/** Claims the model is permitted to make. */
export const ALLOWED_CLAIMS: readonly ClaimType[] = ['observed', 'associated', 'inferred', 'uncertain'];

export function isAllowedClaim(value: unknown): value is ClaimType {
    return typeof value === 'string' && (ALLOWED_CLAIMS as readonly string[]).includes(value);
}

/**
 * Phrases that assert cause, and what to say instead — one table per locale,
 * because the model's reply is in the reader's language, not always Russian.
 *
 * Deliberately a small, specific list rather than a broad filter. Mangling
 * legitimate text to catch a hypothetical is its own failure: a garbled
 * sentence is not safer than a clear one, it is just harder to judge.
 *
 * English matches CONJUGATED verb forms only ("causes", "caused", "causing"),
 * never the bare infinitive/noun "cause": the association insight's own
 * disclaimer ends in "...not a proven cause", and a filter that flagged its
 * own disclaimer would teach the next author to delete the disclaimer to get
 * back to green, which is exactly backwards.
 */
/* `\b` is useless here: JavaScript defines a word boundary against
   `[A-Za-z0-9_]`, so every Cyrillic letter counts as a non-word character and
   `/\bулучшает\b/` never matches Russian text at all. Unicode letter
   lookarounds under the `u` flag are the working equivalent, and they apply
   equally well to English. */
const edge = (phrase: string) => new RegExp(`(?<!\\p{L})${phrase}(?!\\p{L})`, 'giu');

const CAUSAL_PATTERNS: Record<Locale, readonly [RegExp, string][]> = {
    ru: [
        [edge('улучшает'), 'совпадает с более высоким'],
        [edge('ухудшает'), 'совпадает с более низким'],
        [edge('повышает'), 'совпадает с более высоким'],
        [edge('снижает'), 'совпадает с более низким'],
        [edge('приводит к'), 'совпадает с'],
        [edge('вызывает'), 'совпадает с'],
        [edge('влияет на'), 'связан с'],
        [edge('из-за'), 'наряду с'],
        [edge('потому что'), 'наряду с тем, что'],
        [edge('помогает тебе'), 'совпадает с более высоким'],
    ],
    en: [
        [edge('improves'), 'co-occurs with a higher'],
        [edge('worsens'), 'co-occurs with a lower'],
        [edge('increases'), 'co-occurs with a higher'],
        [edge('reduces'), 'co-occurs with a lower'],
        [edge('leads to'), 'co-occurs with'],
        [edge('causes'), 'co-occurs with'],
        [edge('caused'), 'co-occurred with'],
        [edge('causing'), 'co-occurring with'],
        [edge('affects'), 'is associated with'],
        [edge('because of'), 'alongside'],
        [edge('due to'), 'alongside'],
        [edge('helps you'), 'co-occurs with a higher'],
    ],
};

/** Medical framing this app has no standing to use, per locale. */
const MEDICAL_PATTERNS: Record<Locale, readonly RegExp[]> = {
    ru: [
        /(?<!\p{L})диагноз\p{L}*/giu,
        /(?<!\p{L})симптом\p{L}*/giu,
        /(?<!\p{L})расстройств\p{L}*/giu,
        /(?<!\p{L})патологи\p{L}*/giu,
        /(?<!\p{L})норм[аы](?!\p{L})/giu,
    ],
    en: [
        /(?<!\p{L})diagnos\p{L}*/giu,
        /(?<!\p{L})symptom\p{L}*/giu,
        /(?<!\p{L})disorder\p{L}*/giu,
        /(?<!\p{L})patholog\p{L}*/giu,
        /(?<!\p{L})norms?(?!\p{L})/giu,
    ],
};

/**
 * Rewrites causal assertions into co-occurrence, and flags medical language,
 * in whichever locale the text is actually in.
 *
 * The second line of defence. The prompt asks for the right thing; this checks
 * what actually arrived, because a model that has been asked nicely is not a
 * guarantee and the cost of one bad sentence here is a user acting on it.
 */
export function stripCausalLanguage(text: string, locale: Locale): { text: string; changed: boolean; flagged: string[] } {
    let out = text;
    let changed = false;

    for (const [pattern, replacement] of CAUSAL_PATTERNS[locale]) {
        // Compare rather than `test()` first: a /g regex carries `lastIndex`
        // between calls, so testing then replacing starts the replace from the
        // wrong offset and leaves the pattern primed to miss on the next call.
        const next = out.replace(pattern, replacement);
        if (next !== out) { out = next; changed = true; }
    }

    const flagged = MEDICAL_PATTERNS[locale]
        .flatMap(p => out.match(p) ?? [])
        .map(m => m.toLowerCase());

    return { text: out, changed, flagged: [...new Set(flagged)] };
}
