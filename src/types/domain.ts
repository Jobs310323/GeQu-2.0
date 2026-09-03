// The shapes GeQu actually persists.
//
// Derived from the code that writes them, not designed fresh — every field here
// exists in stored user data today, so these types describe reality rather than
// an intention. Anything optional is optional because older records genuinely
// lack it.
//
// Two conventions hold throughout, and `src/lib/datetime.ts` enforces them:
//   `date`/`createdAt`/`updatedAt` ending in an instant  → full ISO-8601 string
//   a field described as a calendar date                 → `YYYY-MM-DD`, local
//
// Phase 8 adds the shared record envelope (`version`, `deletedAt`) these will
// grow into. Until then ids are `Date.now()` numbers, which is why several are
// typed `number` rather than the branded string they should become.

import type { Goal } from './goals';

/** An ISO-8601 instant, e.g. `2026-08-28T07:13:12.337Z`. */
export type Instant = string;

/** A calendar date in the user's timezone, `YYYY-MM-DD`. */
export type DateKey = string;

// --- daily check-in --------------------------------------------------------

/** One closed day. Written by the check-in form; read by almost everything else. */
export interface DayLog {
    id: number;
    date: Instant;
    /** Self-rated 0–10. */
    sleep: number;
    focus: number;
    mood: number;
    /** Tags the user credited for the day going well, plus any body-scan notes. */
    helped: string[];
    /** Tags the user blamed for the day going badly. */
    hindered: string[];
    mainEvent: string;
    testTomorrow: string;
    gratitude: string[];
    customQuestion?: string | undefined;
    customAnswer?: string | undefined;
}

// --- tasks -----------------------------------------------------------------

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

/** A Kanban card. Distinct from `types/goals.ts`'s nested `Task`, which is a goal step. */
export interface KanbanTask {
    id: number;
    text: string;
    status: TaskStatus;
    priority: TaskPriority;
}

// --- habits ----------------------------------------------------------------

export interface Habit {
    id: number;
    name: string;
    /** Calendar dates the habit was completed on. */
    history: DateKey[];
}

// --- journal ---------------------------------------------------------------

export interface DiaryEntry {
    id: number;
    date: Instant;
    /** Markdown. */
    content: string;
}

// --- calendar --------------------------------------------------------------

export interface Reminder {
    id: number;
    /** Calendar date, chosen in the calendar grid. */
    date: DateKey;
    text: string;
    done: boolean;
}

// --- cognitive exercises ---------------------------------------------------

/**
 * One attempt at a cognitive exercise.
 *
 * `value` is the exercise's own raw score with no shared unit — seconds for
 * Schulte, milliseconds for reaction, a level for digit span, a percentage for
 * n-back. `LOWER_IS_BETTER` in `lib/profile.ts` records which way each one runs.
 * Phase 9 replaces this with a real result envelope carrying normalisation,
 * percentile, reference population and test version.
 */
export interface TestResult {
    id: number;
    date: Instant;
    type: string;
    /** The raw score in the exercise's own unit. Never rewritten. */
    value: number;

    /* --- Phase 9 result envelope -------------------------------------------
       Every field below is OPTIONAL, and that is load-bearing rather than lazy.
       Records written before Phase 9 have none of them and must keep loading
       and rendering unchanged — nothing migrates or rewrites stored results.
       Consumers read these with a default and degrade to `value` alone.
       See src/features/cognitive/scoring.ts. */

    /** Bumped when the task changes enough that old scores are incomparable. */
    testVersion?: string;
    /** How long the attempt took. Distinguishes a completed run from an abandoned one. */
    durationMs?: number;
    /** 0–100, higher always better, comparable across exercises. */
    normalizedScore?: number;
    /**
     * Position among the user's OWN previous attempts, 0–100. Absent until
     * there are enough of them to mean anything.
     */
    percentile?: number;
    /**
     * Always `'self'`. These are not standardised instruments and there is no
     * normative sample — a percentile here is never against other people.
     */
    referencePopulation?: 'self';
    /** How much weight the result deserves, derived from sample size. */
    confidence?: 'none' | 'low' | 'moderate';
    /** What this exercise cannot tell you, shown alongside the number. */
    limitations?: readonly string[];
    /** Conditions that materially change the score. */
    deviceContext?: {
        pointer: 'touch' | 'mouse' | 'unknown';
        reducedMotion: boolean;
    };
}

// --- screening questionnaires ----------------------------------------------

/**
 * A completed screening questionnaire.
 *
 * A screening score, not a diagnosis — `lib/clinicalTests.ts` holds the real
 * per-instrument scoring rules and the band definitions `label` comes from.
 */
export interface ClinicalResult {
    id: number;
    testId: string;
    date: Instant;
    score: number;
    label: string;
}

/** A CBT thought record. Every field beyond the first three is optional by design. */
export interface CbtRecord {
    id: number;
    date: Instant;
    situation: string;
    thought: string;
    emotion?: string | undefined;
    evidenceFor?: string | undefined;
    evidenceAgainst?: string | undefined;
    alternative?: string | undefined;
    outcome?: string | undefined;
}

// --- gym -------------------------------------------------------------------

export type ExerciseKind = 'strength' | 'cardio';

export interface WorkoutSet {
    weight?: number;
    reps?: number;
    /** Cardio only, in minutes. */
    duration?: number;
    /** Cardio only, in kilometres. */
    distance?: number;
    /** Cardio only: a label such as "Средняя", not a number. */
    intensity?: string;
    done: boolean;
}

/**
 * An exercise as *planned* in a program.
 *
 * Distinct from `WorkoutExercise` because `sets` means different things in the
 * two: here it is how many sets to do, there it is the sets actually done. The
 * code treated them as one shape, which is why `Array.from({ length: ex.sets })`
 * and `ex.sets.map(...)` both appear against the same nominal type.
 */
export interface ProgramExercise {
    id?: number;
    name: string;
    muscle: string;
    type: ExerciseKind;
    /** How many sets to perform. */
    sets: number;
    /** Planned rep range as authored, e.g. `"8-12"`. */
    reps?: string | number;
    /** Cardio only. */
    intensity?: string;
    duration?: number;
}

/** An exercise as *performed* in a session, with the sets that were logged. */
export interface WorkoutExercise {
    id?: number;
    name: string;
    muscle: string;
    type: ExerciseKind;
    sets: WorkoutSet[];
}

export interface ProgramDay {
    id: number;
    name: string;
    exercises: ProgramExercise[];
}

export interface Program {
    id: number;
    name: string;
    days: ProgramDay[];
}

export interface Workout {
    id: number;
    dayId: number;
    dayName: string;
    date: Instant;
    exercises: WorkoutExercise[];
    /** Epoch milliseconds; `endTime` is null while the session is in progress. */
    startTime: number;
    endTime: number | null;
}

export interface GymData {
    programs: Program[];
    history: Workout[];
    activeProgramId: number | null;
}

export const EMPTY_GYM_DATA: GymData = { programs: [], history: [], activeProgramId: null };

// --- hyperfocus ------------------------------------------------------------

/**
 * A focus session in progress. Held above the routes so navigating does not
 * cancel it, and never persisted — an interrupted session is not a record.
 */
export interface HyperfocusSession {
    status: 'setup' | 'running' | 'finished' | 'interrupted';
    /** Minutes. */
    duration: number;
    task: string;
    /** Open tasks offered in the picker, snapshotted when the session started. */
    todoTasks: KanbanTask[];
}

// --- gamification ----------------------------------------------------------

/** Ids of achievements the user has unlocked. Definitions live in `lib/xp.ts`. */
export type UnlockedAchievements = string[];

// --- re-exports ------------------------------------------------------------
// So a consumer needing "the app's data types" has one import to reach for.

export type { Goal, Task as GoalStep } from './goals';
export type { FinanceData, FinanceEntry, Category, Debt, Subscription } from '../features/finance/types';

/** Everything the app persists per user, in one place. */
export interface GequData {
    logs: DayLog[];
    diary: DiaryEntry[];
    goals: Goal[];
    habits: Habit[];
    kanban: KanbanTask[];
    tests: TestResult[];
    clinical: ClinicalResult[];
    cbt: CbtRecord[];
    reminders: Reminder[];
    gym: GymData;
}
