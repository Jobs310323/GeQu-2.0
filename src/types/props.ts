// Prop contracts for the screens and the components they share.
//
// These exist because every component used to take `({ ... }: any)`, which made
// the whole tree unrefactorable: renaming a field or changing its shape produced
// no error anywhere, only a blank panel at runtime.
//
// Setters are typed as React state setters because that is what they are today —
// state lives in `src/app/AppState.tsx` and is threaded down. Phase 3 replaces
// them with store actions, at which point these become narrower (a page will ask
// for `addTask`, not `setKanban`) rather than disappearing.

import type { Dispatch, SetStateAction } from 'react';
import type {
    DayLog, DiaryEntry, Habit, KanbanTask, TestResult, ClinicalResult, CbtRecord,
    Reminder, GymData, HyperfocusSession, UnlockedAchievements,
} from './domain';
import type { Goal } from './goals';
import type { FinanceData } from '../features/finance/types';
import type { Prefs } from '../lib/prefs';
import type { LevelInfo } from '../lib/xp';
import type { Pomodoro, Theme } from '../stores/app-ui.store';

/** A `useState` setter, the shape every mutation prop currently has. */
export type Setter<T> = Dispatch<SetStateAction<T>>;

// --- screens ---------------------------------------------------------------

export interface DashboardProps {
    logs: DayLog[];
    setLogs: Setter<DayLog[]>;
    achievements: UnlockedAchievements;
    setHyperfocus: Setter<HyperfocusSession | null>;
    kanban: KanbanTask[];
    gymData: GymData;
    testResults: TestResult[];
    prefs: Prefs;
    habits: Habit[];
    setHabits: Setter<Habit[]>;
    levelInfo: LevelInfo;
    /** Derived 0–10 score for the day; see `AppState`. */
    energy: number;
}

export interface KanbanProps {
    kanban: KanbanTask[];
    setKanban: Setter<KanbanTask[]>;
}

export interface HabitsProps {
    habits: Habit[];
    setHabits: Setter<Habit[]>;
}

export interface GoalsProps {
    goals: Goal[];
    setGoals: Setter<Goal[]>;
}

export interface DiaryProps {
    diary: DiaryEntry[];
    setDiary: Setter<DiaryEntry[]>;
}

export interface TrainingProps {
    testResults: TestResult[];
    setTestResults: Setter<TestResult[]>;
    achievements: UnlockedAchievements;
    setAchievements: Setter<UnlockedAchievements>;
    pomodoro: Pomodoro;
    setPomodoro: Setter<Pomodoro>;
}

export interface SettingsProps {
    diary: DiaryEntry[];
    logs: DayLog[];
    prefs: Prefs;
    setPrefs: Setter<Prefs>;
}

export interface UnifiedStatsProps {
    logs: DayLog[];
    testResults: TestResult[];
    gymData: GymData;
}

export interface ProgressProps {
    logs: DayLog[];
    habits: Habit[];
    kanban: KanbanTask[];
    gymData: GymData;
    testResults: TestResult[];
    diary: DiaryEntry[];
}

export interface AiPlanProps {
    logs: DayLog[];
    kanban: KanbanTask[];
    setKanban: Setter<KanbanTask[]>;
    habits: Habit[];
    gymData: GymData;
    testResults: TestResult[];
    energy: number;
}

export interface UserCardProps {
    logs: DayLog[];
    setLogs: Setter<DayLog[]>;
    diary: DiaryEntry[];
    habits: Habit[];
    kanban: KanbanTask[];
    goals: Goal[];
    gymData: GymData;
    testResults: TestResult[];
    clinicalResults: ClinicalResult[];
    cbtRecords: CbtRecord[];
    finance: FinanceData;
}

export interface CalendarProps {
    logs: DayLog[];
    diary: DiaryEntry[];
    gymData: GymData;
    reminders: Reminder[];
    setReminders: Setter<Reminder[]>;
}

export interface ClinicalTestsProps {
    clinicalResults: ClinicalResult[];
    setClinicalResults: Setter<ClinicalResult[]>;
    cbtRecords: CbtRecord[];
    setCbtRecords: Setter<CbtRecord[]>;
}

export interface CbtProps {
    cbtRecords: CbtRecord[];
    setCbtRecords: Setter<CbtRecord[]>;
}

export interface FinanceProps {
    finance: FinanceData;
    setFinance: Setter<FinanceData>;
}

export interface GymProps {
    gymData: GymData;
    setGymData: Setter<GymData>;
    logs: DayLog[];
}

/** Importing a program touches the gym data only — it has no use for day logs. */
export interface ProgramImportProps {
    gymData: GymData;
    setGymData: Setter<GymData>;
    onClose: () => void;
}

export interface DynamicsProps {
    logs: DayLog[];
    testResults: TestResult[];
    gymData: GymData;
}

// --- shared components -----------------------------------------------------

export interface SidebarProps {
    theme: Theme;
    setTheme: Setter<Theme>;
    energy: number;
    todayLog: DayLog | undefined;
    prefs: Prefs;
    levelInfo: LevelInfo;
    reminderCount: number;
    onRoulette: () => void;
}

export interface HyperfocusProps {
    hyperfocus: HyperfocusSession;
    setHyperfocus: Setter<HyperfocusSession | null>;
    kanban: KanbanTask[];
    setDiary: Setter<DiaryEntry[]>;
    setLogs: Setter<DayLog[]>;
    todayLog: DayLog | undefined;
}

export interface DopamineRouletteProps {
    kanban: KanbanTask[];
    setKanban: Setter<KanbanTask[]>;
    dopamineMenu: string[];
    setDopamineMenu: Setter<string[]>;
    energy?: number;
    onClose: () => void;
}

export interface WeekSummaryProps {
    logs: DayLog[];
    habits: Habit[];
    kanban: KanbanTask[];
    gymData: GymData;
    testResults: TestResult[];
    diary: DiaryEntry[];
}

/** Every cognitive exercise records its attempt the same way. */
export interface ExerciseProps {
    setTestResults: Setter<TestResult[]>;
}

/** Exercises that can also unlock an achievement on a good run. */
export interface ScoredExerciseProps extends ExerciseProps {
    achievements: UnlockedAchievements;
    setAchievements: Setter<UnlockedAchievements>;
}
