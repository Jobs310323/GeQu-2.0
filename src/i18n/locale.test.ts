import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveLocale, normalizeLocale, isLocale, storeLocale, getLocale, LOCALE_KEY } from './locale';

/**
 * The rule under test is the one that could go wrong silently and badly.
 *
 * Every existing user of this app is Russian-speaking, and until this phase
 * there was no language setting for them to have expressed a preference with.
 * If locale resolution fell through to `navigator.language` for them, a Russian
 * user on an English-locale machine would open the app one morning to find it
 * in a language they may not read, with the way back written in that language.
 *
 * That is a data-continuity failure wearing a preferences costume, which is why
 * it is asserted here rather than left to a comment.
 */

/** jsdom's navigator languages are read-only getters; this replaces them. */
function withBrowserLanguages(tags: string[], run: () => void) {
    const languages = Object.getOwnPropertyDescriptor(Navigator.prototype, 'languages');
    const language = Object.getOwnPropertyDescriptor(Navigator.prototype, 'language');
    Object.defineProperty(navigator, 'languages', { value: tags, configurable: true });
    Object.defineProperty(navigator, 'language', { value: tags[0] ?? 'en', configurable: true });
    try {
        run();
    } finally {
        delete (navigator as unknown as Record<string, unknown>)['languages'];
        delete (navigator as unknown as Record<string, unknown>)['language'];
        if (languages) Object.defineProperty(Navigator.prototype, 'languages', languages);
        if (language) Object.defineProperty(Navigator.prototype, 'language', language);
    }
}

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('an existing user', () => {
    it('stays in Russian when they have data and no stored choice', () => {
        localStorage.setItem('gequ_diary', '[]');
        withBrowserLanguages(['en-US'], () => {
            expect(resolveLocale()).toBe('ru');
        });
    });

    it('stays in Russian whatever the browser says', () => {
        localStorage.setItem('gequ_kanban', '[]');
        withBrowserLanguages(['de-DE', 'fr-FR'], () => {
            expect(resolveLocale()).toBe('ru');
        });
    });

    it('is overridden the moment they choose a language', () => {
        localStorage.setItem('gequ_diary', '[]');
        localStorage.setItem(LOCALE_KEY, 'en');
        withBrowserLanguages(['ru-RU'], () => {
            expect(resolveLocale()).toBe('en');
        });
    });
});

describe('a new user', () => {
    it('gets their browser language when we speak it', () => {
        withBrowserLanguages(['ru-RU'], () => expect(resolveLocale()).toBe('ru'));
    });

    it('falls back to English when we do not', () => {
        withBrowserLanguages(['ja-JP', 'ko-KR'], () => expect(resolveLocale()).toBe('en'));
    });

    it('walks the preference list rather than stopping at the first entry', () => {
        withBrowserLanguages(['ja-JP', 'ru-RU'], () => expect(resolveLocale()).toBe('ru'));
    });

    it('is not mistaken for an existing user by the locale key alone', () => {
        // `gequ_locale` is written by this module, so a browser holding only
        // that key has never actually used the app.
        localStorage.setItem(LOCALE_KEY, 'nonsense');
        withBrowserLanguages(['en-US'], () => expect(resolveLocale()).toBe('en'));
    });
});

describe('tag handling', () => {
    it('accepts a region subtag', () => {
        expect(normalizeLocale('ru-RU')).toBe('ru');
        expect(normalizeLocale('EN-gb')).toBe('en');
    });

    it('rejects what it does not speak, rather than guessing', () => {
        expect(normalizeLocale('uk')).toBeUndefined();
        expect(normalizeLocale('')).toBeUndefined();
        expect(normalizeLocale(null)).toBeUndefined();
        expect(isLocale('uk')).toBe(false);
    });
});

describe('storing a choice', () => {
    it('persists it, reflects it on <html lang>, and updates the current locale', () => {
        storeLocale('ru');
        expect(localStorage.getItem(LOCALE_KEY)).toBe('ru');
        expect(document.documentElement.lang).toBe('ru');
        expect(getLocale()).toBe('ru');
        storeLocale('en');
        expect(document.documentElement.lang).toBe('en');
    });

    it('still changes the language when storage is unavailable', () => {
        // Private mode, or a browser set to block site data. The choice must
        // survive for this session even if it cannot be remembered.
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(() => storeLocale('ru')).not.toThrow();
        expect(getLocale()).toBe('ru');
    });
});
