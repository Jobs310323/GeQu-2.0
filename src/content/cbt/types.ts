// Shared shape for the CBT module's psychoeducational content — cognitive
// distortions, coping practices, and the thought-record field labels. This is
// content, not translation strings: each locale is a complete, independently
// authored file (see ADR-006 and docs/I18N.md), not a machine translation of
// the other.

export type Distortion = {
    id: string;
    name: string;
    short: string;
    example: string;
    question: string; // the question that loosens this particular thought
};

export type Practice = {
    id: string;
    title: string;
    icon: string;
    why: string;
    steps: string[];
};

export type RecordField = {
    key: 'situation' | 'thought' | 'emotion' | 'evidenceFor' | 'evidenceAgainst' | 'alternative';
    label: string;
    hint: string;
};
