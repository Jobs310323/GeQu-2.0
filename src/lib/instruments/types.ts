// Per-locale wording for the validated screening instruments.
//
// This is content, not translation-key JSON — see ADR-006 and
// docs/I18N.md. The wording IS the instrument: item text, response-option
// labels and band labels are entered here as real content for each locale,
// never generated from another locale, so no tooling can "helpfully"
// auto-fill a locale that has not actually been validated.
//
// Order is the contract with `lib/clinicalTests.ts`'s scoring definitions:
// `optionText[i]` labels the option whose value is `scoring.optionValues[i]`,
// and `bandLabels[i]` labels the band described by `scoring.bands[i]`.

export type InstrumentText = {
    name: string;
    short: string;
    intro: string;
    period: string;
    questions: string[];
    optionText: string[];
    bandLabels: string[];
    note?: string;
};

export type InstrumentTextBundle = Record<string, InstrumentText>;
