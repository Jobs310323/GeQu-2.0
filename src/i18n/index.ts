// i18next setup.
//
// The split of responsibilities, which is the whole reason this file is short:
// i18next SELECTS a string (fallback chain, namespace, plural category);
// `lib/format.ts` FORMATS the values inside it, using `Intl` directly. Nothing
// here configures date or number formats, because nothing here should.
//
// Resources are bundled rather than fetched. Two locales of UI strings are a
// few tens of kilobytes, and a network round-trip before the first paint —
// on an app whose whole point is opening fast — is a bad trade. Long-form
// content is the exception and lives in `src/content/`, loaded per article.

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, resolveLocale, setCurrentLocale, storeLocale, applyDocumentLocale, type Locale } from './locale';

import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';
import enToday from './locales/en/today.json';
import enCapture from './locales/en/capture.json';
import enInsights from './locales/en/insights.json';
import enTrack from './locales/en/track.json';
import enGym from './locales/en/gym.json';
import enProfile from './locales/en/profile.json';
import enBrain from './locales/en/brain.json';
import ruCommon from './locales/ru/common.json';
import ruNav from './locales/ru/nav.json';
import ruToday from './locales/ru/today.json';
import ruCapture from './locales/ru/capture.json';
import ruInsights from './locales/ru/insights.json';
import ruTrack from './locales/ru/track.json';
import ruGym from './locales/ru/gym.json';
import ruProfile from './locales/ru/profile.json';
import ruBrain from './locales/ru/brain.json';

export const NAMESPACES = ['common', 'nav', 'today', 'capture', 'insights', 'track', 'gym', 'profile', 'brain'] as const;

export const resources = {
    en: { common: enCommon, nav: enNav, today: enToday, capture: enCapture, insights: enInsights, track: enTrack, gym: enGym, profile: enProfile, brain: enBrain },
    ru: { common: ruCommon, nav: ruNav, today: ruToday, capture: ruCapture, insights: ruInsights, track: ruTrack, gym: ruGym, profile: ruProfile, brain: ruBrain },
} as const;

const locale = resolveLocale();
setCurrentLocale(locale);
applyDocumentLocale(locale);

void i18next.use(initReactI18next).init({
    resources,
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    defaultNS: 'common',
    ns: NAMESPACES,
    interpolation: {
        // React escapes for us; letting i18next escape as well double-encodes
        // any apostrophe or quote that appears inside a translated string.
        escapeValue: false,
    },
    returnNull: false,
});

/** Switches language for the session and remembers the choice. */
export async function changeLocale(next: Locale): Promise<void> {
    storeLocale(next);
    await i18next.changeLanguage(next);
}

export { i18next };
