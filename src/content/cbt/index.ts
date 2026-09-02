// The CBT module's psychoeducational content — distortions, coping practices
// and thought-record field labels — as real per-locale content rather than
// translation-key JSON. Each locale file is authored independently (see
// content/cbt/{en,ru}.ts); nothing here machine-translates one into the other.

import type { Locale } from '../../i18n/locale';
import * as ru from './ru';
import * as en from './en';
import type { Distortion, Practice, RecordField } from './types';

export type { Distortion, Practice, RecordField };

const BY_LOCALE = { ru, en } satisfies Record<Locale, typeof ru>;

export function cbtDistortions(locale: Locale): Distortion[] {
    return BY_LOCALE[locale].distortions;
}

export function cbtPractices(locale: Locale): Practice[] {
    return BY_LOCALE[locale].practices;
}

export function cbtRecordFields(locale: Locale): readonly RecordField[] {
    return BY_LOCALE[locale].recordFields;
}
