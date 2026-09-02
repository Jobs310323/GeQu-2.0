// Which language the app speaks, and how that is decided.
//
// English is the source locale: keys are authored in English and `en` is the
// fallback for anything a translation is missing. That is a decision about the
// codebase, not about the user — see `resolveLocale()` for what an actual
// person gets.

export const SUPPORTED_LOCALES = ['en', 'ru'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

// A language is named in its own script, so that someone who has landed in a
// language they cannot read can still find their way out of the picker.
export const LOCALE_NAMES: Record<Locale, string> = {
    en: 'English',
    ru: 'Русский', // i18n-allow: endonym
};

export function isLocale(value: unknown): value is Locale {
    return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** `ru-RU` and `ru` both mean `ru`; anything unsupported yields undefined. */
export function normalizeLocale(tag: string | null | undefined): Locale | undefined {
    if (!tag) return undefined;
    const base = tag.toLowerCase().split('-')[0];
    return isLocale(base) ? base : undefined;
}

/**
 * True when this browser already holds GeQu data.
 *
 * Read synchronously from localStorage rather than the repository: this runs
 * before the first render, and the repository's IndexedDB read is async. Since
 * Phase 8b writes to both, localStorage is authoritative for "has this person
 * used the app before".
 */
function hasExistingData(): boolean {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // `gequ_locale` itself does not count — it is written by this module.
            if (key?.startsWith('gequ_') && key !== LOCALE_KEY) return true;
        }
    } catch {
        // Private mode or blocked storage: treat as a new user.
    }
    return false;
}

export const LOCALE_KEY = 'gequ_locale';

/**
 * The locale in effect right now.
 *
 * Held here rather than read from i18next so that `lib/format.ts` — which is
 * pure `Intl` and has no business importing a React binding — can ask for it
 * without pulling i18next into every module that formats a number.
 */
let current: Locale = DEFAULT_LOCALE;

export function getLocale(): Locale {
    return current;
}

export function setCurrentLocale(locale: Locale): void {
    current = locale;
}

function storedLocale(): Locale | undefined {
    try {
        return normalizeLocale(localStorage.getItem(LOCALE_KEY));
    } catch {
        return undefined;
    }
}

/**
 * The locale to start in.
 *
 *   1. an explicit choice the user made
 *   2. `ru` if this browser already holds GeQu data
 *   3. the browser's own language, if we speak it
 *   4. English
 *
 * Step 2 is the one that matters and the one that looks odd. Every existing
 * user of this app is Russian-speaking; the app had no language setting until
 * now, so none of them can have expressed a preference. Falling through to
 * `navigator.language` would open their app in English one morning, with no
 * warning and no obvious way back — data continuity, not a taste question.
 * New installs never take this branch.
 */
export function resolveLocale(): Locale {
    const stored = storedLocale();
    if (stored) return stored;

    if (hasExistingData()) return 'ru';

    const candidates = typeof navigator === 'undefined'
        ? []
        : [...(navigator.languages ?? []), navigator.language];
    for (const tag of candidates) {
        const locale = normalizeLocale(tag);
        if (locale) return locale;
    }

    return DEFAULT_LOCALE;
}

/** Persists the user's choice and reflects it on `<html lang>`. */
export function storeLocale(locale: Locale): void {
    setCurrentLocale(locale);
    try {
        localStorage.setItem(LOCALE_KEY, locale);
    } catch {
        // Storage failures must not stop the language from changing for this session.
    }
    applyDocumentLocale(locale);
}

/**
 * Keeps `<html lang>` in step with the UI language.
 *
 * `index.html` ships a static `lang`, which is wrong the moment the app speaks
 * anything else: screen readers pick pronunciation from it, and so does the
 * browser's own translation prompt.
 */
export function applyDocumentLocale(locale: Locale): void {
    if (typeof document !== 'undefined') {
        document.documentElement.lang = locale;
    }
}
