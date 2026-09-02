// Ad-hoc achievements awarded inside two exercises.
//
// Separate from `lib/xp.ts`'s ACHIEVEMENTS, which are computed from the whole
// data set. These are awarded in the moment, by name, and — like everything
// else in this app that ended up in a stored array — the NAME is what is
// stored. `app-ui`'s `achievements` is a `string[]` of exactly these strings,
// synced with the rest of the snapshot.
//
// So the stored id stays what it has always been, and only the toast that
// announces it is translated. An achievement earned in Russian and read back
// in English shows the same string it was earned under, which is the honest
// outcome: renaming it retroactively would be rewriting the user's record.

export const REACTION_ACHIEVEMENTS = {
    superhuman: 'Сверхреакция (<200 мс)',   // i18n-allow: stored id
    lightning: 'Молния (<250 мс)',          // i18n-allow: stored id
    quickHand: 'Быстрая рука (<300 мс)',    // i18n-allow: stored id
} as const;

export const SCHULTE_ACHIEVEMENTS = {
    lightning: 'Молния (<30с)',             // i18n-allow: stored id
    sniper: 'Снайпер (<45с)',               // i18n-allow: stored id
    steady: 'Стабильность (<60с)',          // i18n-allow: stored id
} as const;

const KEYS: Record<string, string> = {
    [REACTION_ACHIEVEMENTS.superhuman]: 'brain:ex.reaction.achievement.superhuman',
    [REACTION_ACHIEVEMENTS.lightning]: 'brain:ex.reaction.achievement.lightning',
    [REACTION_ACHIEVEMENTS.quickHand]: 'brain:ex.reaction.achievement.quickHand',
    [SCHULTE_ACHIEVEMENTS.lightning]: 'brain:ex.schulte.achievement.lightning',
    [SCHULTE_ACHIEVEMENTS.sniper]: 'brain:ex.schulte.achievement.sniper',
    [SCHULTE_ACHIEVEMENTS.steady]: 'brain:ex.schulte.achievement.steady',
};

/** The achievement's name in the reader's language; anything unknown verbatim. */
export function achievementName(id: string, t: (key: string) => string): string {
    const key = KEYS[id];
    return key ? t(key) : id;
}
