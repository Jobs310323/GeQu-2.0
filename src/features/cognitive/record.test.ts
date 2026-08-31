import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recordAttempt } from './record';
import { engineFor } from './registry';
import { historyFor } from './scoring';
import { buildProfile } from '../../lib/profile';
import { EMPTY_GYM_DATA, type TestResult } from '../../types/domain';

/**
 * The envelope is additive, and this file is what makes that claim checkable.
 *
 * A user who has been using GeQu for a year has results shaped
 * `{id, date, type, value}` and nothing else. Nothing migrates them — deciding
 * retroactively what device someone used or how long an attempt took would be
 * fabrication. So every consumer has to keep working with results that have no
 * envelope, forever.
 */

/** Collects what `recordAttempt` produces, the way a store would. */
function record(type: string, raw: number, previous: TestResult[] = [], opts = {}) {
    let out: TestResult[] = previous;
    recordAttempt(next => { out = typeof next === 'function' ? next(previous) : next; }, type, raw, opts);
    return out;
}

beforeEach(() => vi.restoreAllMocks());

describe('what gets stored', () => {
    it('keeps the raw score in `value`, unchanged', () => {
        const [r] = record('schulte', 38.4);
        expect(r!.value).toBe(38.4);
    });

    it('attaches the envelope', () => {
        const [r] = record('schulte', 38.4);
        expect(r).toMatchObject({
            type: 'schulte',
            testVersion: engineFor('schulte')!.version,
            referencePopulation: 'self',
            confidence: 'none',
        });
        expect(r!.normalizedScore).toBeGreaterThanOrEqual(0);
        expect(r!.limitations!.length).toBeGreaterThan(0);
    });

    it('withholds the percentile on an early attempt', () => {
        const [r] = record('schulte', 38.4);
        expect(r!.percentile).toBeUndefined();
    });

    it('reports a percentile once enough history exists', () => {
        const history: TestResult[] = [40, 39, 38, 37, 36].map((v, i) => ({
            id: i, date: '2026-08-01T00:00:00Z', type: 'schulte', value: v, testVersion: '1.0.0',
        }));
        const out = record('schulte', 30, history);
        expect(out.at(-1)!.percentile).toBe(100);
        expect(out.at(-1)!.confidence).toBe('low');
    });

    it('records an unknown exercise rather than dropping the result', () => {
        // A registry that has fallen out of date must never cost a user their
        // data. Stored without an envelope is fine; not stored is not.
        const [r] = record('some-new-exercise', 12);
        expect(r).toMatchObject({ type: 'some-new-exercise', value: 12 });
        expect(r!.testVersion).toBeUndefined();
    });

    it('carries an explicit duration when the exercise supplies one', () => {
        const [r] = record('schulte', 38.4, [], { durationMs: 38_400 });
        expect(r!.durationMs).toBe(38_400);
    });
});

describe('records written before the envelope existed', () => {
    const legacy: TestResult[] = [
        { id: 1, date: '2025-09-01T10:00:00Z', type: 'schulte', value: 52 },
        { id: 2, date: '2025-10-01T10:00:00Z', type: 'schulte', value: 47 },
        { id: 3, date: '2025-11-01T10:00:00Z', type: 'reaction', value: 310 },
    ];

    it('still count toward history', () => {
        // Excluding them would silently discard a year of the user's own data.
        expect(historyFor(engineFor('schulte')!, legacy)).toEqual([52, 47]);
    });

    it('are never rewritten by a new attempt', () => {
        const out = record('schulte', 40, legacy);
        expect(out.slice(0, 3)).toEqual(legacy);
    });

    it('still aggregate into the profile', () => {
        // `buildProfile` predates the envelope and must not need it.
        const profile = buildProfile({
            logs: [], diary: [], habits: [], kanban: [], goals: [],
            gymData: EMPTY_GYM_DATA, testResults: legacy,
        });
        const schulte = profile.cognitive.find(t => t.type === 'schulte');
        expect(schulte).toBeDefined();
        expect(schulte!.count).toBe(2);
        expect(schulte!.best).toBe(47);   // lower is better
    });

    it('mix with new records without either being lost', () => {
        const out = record('schulte', 40, legacy);
        expect(out).toHaveLength(4);
        expect(out.at(-1)!.testVersion).toBe('1.0.0');
        expect(out[0]!.testVersion).toBeUndefined();

        const profile = buildProfile({
            logs: [], diary: [], habits: [], kanban: [], goals: [],
            gymData: EMPTY_GYM_DATA, testResults: out,
        });
        expect(profile.cognitive.find(t => t.type === 'schulte')!.count).toBe(3);
    });
});

describe('the honesty invariants', () => {
    it('never reports a reference population other than self', () => {
        // If this ever changes, a user is being told they rank against other
        // people — which nothing in this app could support.
        for (const type of ['schulte', 'reaction', 'digitspan', 'nback']) {
            const [r] = record(type, 10);
            expect(r!.referencePopulation, type).toBe('self');
        }
    });

    it('never reports confidence above moderate', () => {
        const many: TestResult[] = Array.from({ length: 500 }, (_, i) => ({
            id: i, date: '2026-08-01T00:00:00Z', type: 'schulte', value: 40, testVersion: '1.0.0',
        }));
        expect(record('schulte', 35, many).at(-1)!.confidence).toBe('moderate');
    });

    it('attaches limitations to every registered exercise', () => {
        for (const type of ['schulte', 'reaction', 'tmt', 'stroop', 'digitspan', 'corsi', 'nback', 'gonogo']) {
            const [r] = record(type, 10);
            expect(r!.limitations, type).toBeDefined();
            expect(r!.limitations!.length, type).toBeGreaterThan(0);
        }
    });
});
