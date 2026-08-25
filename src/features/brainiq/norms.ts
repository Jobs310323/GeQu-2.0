// Shared scoring math: raw score -> percentile -> IQ-scale index, against a
// mean/sd norm. These are approximate, illustrative norms (not a validated
// clinical instrument) — every test surfaces that in its results view.

/** Standard normal CDF, Abramowitz & Stegun 7.1.26 approximation (good to ~1e-7). */
function normalCdf(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp(-z * z / 2);
    let p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    if (z > 0) p = 1 - p;
    return p;
}

export function percentileFromZ(z: number): number {
    return Math.round(normalCdf(z) * 100);
}

/** Mean 100, SD 15 — the conventional IQ scale. */
export function iqFromZ(z: number): number {
    return Math.round(100 + z * 15);
}

export function scoreAgainstNorm(raw: number, mean: number, sd: number) {
    const z = sd > 0 ? (raw - mean) / sd : 0;
    return { percentile: percentileFromZ(z), iq: iqFromZ(z) };
}

export interface AgeBracket { maxAge: number; label: string }

export const AGE_BRACKETS: AgeBracket[] = [
    { maxAge: 17, label: '≤17' },
    { maxAge: 25, label: '18–25' },
    { maxAge: 35, label: '26–35' },
    { maxAge: 50, label: '36–50' },
    { maxAge: 65, label: '51–65' },
    { maxAge: 200, label: '65+' },
];

export function bracketIndexForAge(age: number): number {
    const i = AGE_BRACKETS.findIndex(b => age <= b.maxAge);
    return i === -1 ? AGE_BRACKETS.length - 1 : i;
}
