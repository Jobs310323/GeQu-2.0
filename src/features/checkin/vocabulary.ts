// Check-in tags and body-scan items.
//
// Like the gym's muscle groups, these are STORED VALUES. A closed day writes
// `helped: ['Кофе']` and `bodyScan: ['☀️ Солнце']` into the record, the insights
// engine counts blockers by exact tag text, and `lib/profile.ts` aggregates
// `helpedTop` the same way. Translating the arrays would orphan every day the
// user has already closed and split their tag history in two.
//
// So the id stays what it has always been and is treated as opaque; only the
// display goes through translation. A tag the user typed themselves has no
// entry here and passes through unchanged in every language, which is correct —
// it is their word.

/** Stored ids for the suggested "what helped" tags, in display order. */
export const HELPED_TAG_IDS = ['Кофе', 'Спорт', 'Сон', 'Pomodoro', 'Интерес к задаче', 'Медитация'] as const; // i18n-allow: stored ids

/** Stored ids for the suggested "what got in the way" tags. */
export const HINDERED_TAG_IDS = ['Телефон', 'Усталость', 'Шум', 'Скука', 'Голод', 'Откладывание'] as const; // i18n-allow: stored ids

const TAG_KEYS: Record<string, string> = {
    'Кофе': 'today:checkin.tag.coffee',                 // i18n-allow: stored id
    'Спорт': 'today:checkin.tag.sport',                 // i18n-allow: stored id
    'Сон': 'today:checkin.tag.sleep',                   // i18n-allow: stored id
    'Pomodoro': 'today:checkin.tag.pomodoro',
    'Интерес к задаче': 'today:checkin.tag.interest',   // i18n-allow: stored id
    'Медитация': 'today:checkin.tag.meditation',        // i18n-allow: stored id
    'Телефон': 'today:checkin.tag.phone',               // i18n-allow: stored id
    'Усталость': 'today:checkin.tag.tired',             // i18n-allow: stored id
    'Шум': 'today:checkin.tag.noise',                   // i18n-allow: stored id
    'Скука': 'today:checkin.tag.bored',                 // i18n-allow: stored id
    'Голод': 'today:checkin.tag.hungry',                // i18n-allow: stored id
    'Откладывание': 'today:checkin.tag.delay',          // i18n-allow: stored id
    // Written by the hyperfocus overlay when a cycle is interrupted. Not in
    // HINDERED_TAG_IDS on purpose: they are recognised for display but not
    // offered as suggestions on the check-in screen.
    'Мысли': 'today:checkin.tag.thoughts',              // i18n-allow: stored id
    'Люди': 'today:checkin.tag.people',                 // i18n-allow: stored id
};

/**
 * The reasons the hyperfocus overlay offers when a cycle is broken.
 *
 * They go straight into the day's `hindered` array, so they have to be from the
 * same vocabulary as the check-in tags — otherwise "Телефон" logged from
 * hyperfocus and "Телефон" ticked at day-close would count as two different
 * blockers in the insights engine.
 */
export const DISTRACTION_IDS = ['Телефон', 'Шум', 'Голод', 'Мысли', 'Люди'] as const; // i18n-allow: stored ids

/**
 * The body-scan checklist.
 *
 * The stored id carries an emoji because it always has — these strings are in
 * every closed day's `bodyScan` array — so it stays exactly as written. `key`
 * is what the user reads; `icon` is split out so the emoji shows beside a
 * translated label rather than being embedded in one.
 */
export const BODY_SCAN_ITEMS = [
    { id: '☀️ Солнце', icon: '☀️', key: 'today:checkin.scan.sun' },           // i18n-allow: stored id
    { id: '💧 Вода', icon: '💧', key: 'today:checkin.scan.water' },            // i18n-allow: stored id
    { id: '🍽 Питание', icon: '🍽', key: 'today:checkin.scan.food' },          // i18n-allow: stored id
    { id: '📱 Без телефона', icon: '📱', key: 'today:checkin.scan.nophone' },  // i18n-allow: stored id
    { id: '🌿 Дыхание', icon: '🌿', key: 'today:checkin.scan.breath' },        // i18n-allow: stored id
    { id: '📖 Чтение', icon: '📖', key: 'today:checkin.scan.reading' },        // i18n-allow: stored id
    { id: '🚶 Шаги', icon: '🚶', key: 'today:checkin.scan.steps' },            // i18n-allow: stored id
    { id: '🎯 Задача', icon: '🎯', key: 'today:checkin.scan.task' },           // i18n-allow: stored id
    { id: '🏋️ Зал', icon: '🏋️', key: 'today:checkin.scan.gym' },              // i18n-allow: stored id
    { id: '🎓 Тест', icon: '🎓', key: 'today:checkin.scan.test' },             // i18n-allow: stored id
] as const;

/** Which body-scan ids the app can tick on the user's behalf from other records. */
export const AUTO_SCAN = { gym: '🏋️ Зал', test: '🎓 Тест' } as const; // i18n-allow: stored ids

type Translate = (key: string) => string;

/** A suggested tag in the reader's language; a tag they typed, verbatim. */
export function tagLabel(id: string, t: Translate): string {
    const key = TAG_KEYS[id];
    return key ? t(key) : id;
}
