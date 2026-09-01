// Muscle groups and cardio intensities.
//
// These look like display strings and are not: they are STORED VALUES. Every
// exercise ever saved carries `muscle: 'Грудь'` or `intensity: 'Средняя'` in
// localStorage and in the cloud snapshot, and the records screen groups by them
// with `===`. Translating the arrays would have made every existing workout
// ungroupable and every stored intensity unrecognised — the same defect the
// command palette had, where a Russian display string was doing load-bearing
// work as a discriminant.
//
// So the stored value stays exactly what it has always been, and is treated as
// an opaque id. Display goes through `muscleLabel` / `intensityLabel`, which
// translate a known id and pass anything else through untouched — an exercise
// whose muscle the user typed themselves keeps their word in every language.
//
// New records keep writing the Russian ids. That is deliberate: changing what
// is written would split the vocabulary in two, and old and new records would
// stop grouping together.

/** The stored value for each muscle group, in the order the picker shows them. */
// i18n-allow: stored values, not labels — every saved exercise holds these
export const MUSCLE_IDS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Руки', 'Пресс', 'Всё тело'] as const; // i18n-allow

/** The stored value cardio exercises carry as their muscle group. */
export const CARDIO_MUSCLE = 'Кардио'; // i18n-allow: stored value

/** The stored value for each cardio intensity. */
export const INTENSITY_IDS = ['Низкая', 'Средняя', 'Высокая', 'Интервалы'] as const; // i18n-allow: stored values

export const DEFAULT_INTENSITY = 'Средняя'; // i18n-allow: stored value

/** Not a stored value — the "no filter" option on the records screen. */
export const ALL_FILTER = '__all__';

const MUSCLE_KEYS: Record<string, string> = {
    'Грудь': 'gym:muscle.chest', // i18n-allow: stored id
    'Спина': 'gym:muscle.back', // i18n-allow: stored id
    'Ноги': 'gym:muscle.legs', // i18n-allow: stored id
    'Плечи': 'gym:muscle.shoulders', // i18n-allow: stored id
    'Руки': 'gym:muscle.arms', // i18n-allow: stored id
    'Пресс': 'gym:muscle.core', // i18n-allow: stored id
    'Всё тело': 'gym:muscle.fullBody', // i18n-allow: stored id
    [CARDIO_MUSCLE]: 'gym:muscle.cardio',
    [ALL_FILTER]: 'gym:muscle.all',
};

const INTENSITY_KEYS: Record<string, string> = {
    'Низкая': 'gym:intensity.low', // i18n-allow: stored id
    'Средняя': 'gym:intensity.medium', // i18n-allow: stored id
    'Высокая': 'gym:intensity.high', // i18n-allow: stored id
    'Интервалы': 'gym:intensity.intervals', // i18n-allow: stored id
};

type Translate = (key: string) => string;

/** A known muscle id in the reader's language; anything else verbatim. */
export function muscleLabel(id: string, t: Translate): string {
    const key = MUSCLE_KEYS[id];
    return key ? t(key) : id;
}

/** A known intensity in the reader's language; anything else verbatim. */
export function intensityLabel(id: string, t: Translate): string {
    const key = INTENSITY_KEYS[id];
    return key ? t(key) : id;
}
