import { lazy, type ComponentType } from 'react';
import { Today } from '../features/today/Today';
import { useCheckins } from '../stores/checkins.store';
import { useTasks } from '../stores/tasks.store';
import { useHabits } from '../stores/habits.store';
import { useJournal } from '../stores/journal.store';
import { useCognitive } from '../stores/cognitive.store';
import { useBody } from '../stores/body.store';
import { useFinance } from '../stores/finance.store';
import { useCalendar } from '../stores/calendar.store';
import { useAppUi } from '../stores/app-ui.store';
import { useEnergy, useLevelInfo } from '../stores/derived';
import type {
    DashboardProps, KanbanProps, HabitsProps, GoalsProps, DiaryProps, TrainingProps,
    SettingsProps, UnifiedStatsProps, ProgressProps, AiPlanProps, UserCardProps,
    CalendarProps, ClinicalTestsProps, FinanceProps, GymProps,
} from '../types/props';

// Every page is a separate chunk. These adapters are the only place that knows
// how a page wants its data — each one subscribes to the specific slices its
// page renders, so editing a journal entry does not re-render the Kanban board.
//
// The pages still take `set*` props because that is the shape they were written
// in; Phase 4 narrows them to intent-named actions as each screen is reworked.

// The loader is generic over the page's own prop type, so each adapter below is
// checked against the real contract in types/props.ts rather than against `any`.
// A page's props changing shows up here, at the one call site that supplies them.
const load = <P,>(name: string, importer: () => Promise<Record<string, unknown>>) =>
    lazy(async () => ({ default: (await importer())[name] as ComponentType<P> }));

const Dashboard = load<DashboardProps>('Dashboard', () => import('../pages/Dashboard'));
const Kanban = load<KanbanProps>('Kanban', () => import('../pages/Kanban'));
const Habits = load<HabitsProps>('Habits', () => import('../pages/Habits'));
const Goals = load<GoalsProps>('Goals', () => import('../pages/Goals'));
const MindMap = load<object>('MindMap', () => import('../pages/MindMap'));
const Diary = load<DiaryProps>('Diary', () => import('../pages/Diary'));
const Training = load<TrainingProps>('Training', () => import('../pages/Training'));
const Knowledge = load<object>('Knowledge', () => import('../pages/Knowledge'));
const Settings = load<SettingsProps>('Settings', () => import('../pages/Settings'));
const UnifiedStats = load<UnifiedStatsProps>('UnifiedStats', () => import('../pages/UnifiedStats'));
const Progress = load<ProgressProps>('Progress', () => import('../pages/Progress'));
const AiPlan = load<AiPlanProps>('AiPlan', () => import('../pages/AiPlan'));
const UserCard = load<UserCardProps>('UserCard', () => import('../pages/UserCard'));
const CalendarPage = load<CalendarProps>('CalendarPage', () => import('../pages/CalendarPage'));
const ClinicalTests = load<ClinicalTestsProps>('ClinicalTests', () => import('../pages/ClinicalTests'));
const Finance = load<FinanceProps>('Finance', () => import('../pages/Finance'));
const GymApp = load<GymProps>('GymApp', () => import('../features/gym/Gym'));

export function CheckinRoute() {
    const logs = useCheckins(s => s.logs);
    const setLogs = useCheckins(s => s.replaceAll);
    const achievements = useCognitive(s => s.achievements);
    const setHyperfocus = useAppUi(s => s.setHyperfocus);
    const kanban = useTasks(s => s.kanban);
    const gymData = useBody(s => s.gym);
    const testResults = useCognitive(s => s.results);
    const prefs = useAppUi(s => s.prefs);
    const habits = useHabits(s => s.habits);
    const setHabits = useHabits(s => s.setHabits);
    const levelInfo = useLevelInfo();
    const energy = useEnergy();

    return (
        <Dashboard
            logs={logs} setLogs={setLogs} achievements={achievements} setHyperfocus={setHyperfocus}
            kanban={kanban} gymData={gymData} testResults={testResults} prefs={prefs}
            habits={habits} setHabits={setHabits} levelInfo={levelInfo} energy={energy}
        />
    );
}

/** The Today surface. Small and eager: it is the first paint of every session. */
export function TodayRoute() {
    return <Today />;
}

export function KanbanRoute() {
    const kanban = useTasks(s => s.kanban);
    const setKanban = useTasks(s => s.setKanban);
    return <Kanban kanban={kanban} setKanban={setKanban} />;
}

export function HabitsRoute() {
    const habits = useHabits(s => s.habits);
    const setHabits = useHabits(s => s.setHabits);
    return <Habits habits={habits} setHabits={setHabits} />;
}

export function GoalsRoute() {
    const goals = useTasks(s => s.goals);
    const setGoals = useTasks(s => s.setGoals);
    return <Goals goals={goals} setGoals={setGoals} />;
}

export function MindMapRoute() {
    return <MindMap />;
}

export function DiaryRoute() {
    const diary = useJournal(s => s.entries);
    const setDiary = useJournal(s => s.setEntries);
    return <Diary diary={diary} setDiary={setDiary} />;
}

export function TrainingRoute() {
    const testResults = useCognitive(s => s.results);
    const setTestResults = useCognitive(s => s.setResults);
    const achievements = useCognitive(s => s.achievements);
    const setAchievements = useCognitive(s => s.setAchievements);
    const pomodoro = useAppUi(s => s.pomodoro);
    const setPomodoro = useAppUi(s => s.setPomodoro);
    return (
        <Training
            setTestResults={setTestResults} testResults={testResults}
            achievements={achievements} setAchievements={setAchievements}
            pomodoro={pomodoro} setPomodoro={setPomodoro}
        />
    );
}

export function KnowledgeRoute() {
    return <Knowledge />;
}

export function SettingsRoute() {
    const diary = useJournal(s => s.entries);
    const logs = useCheckins(s => s.logs);
    const prefs = useAppUi(s => s.prefs);
    const setPrefs = useAppUi(s => s.setPrefs);
    return <Settings diary={diary} logs={logs} prefs={prefs} setPrefs={setPrefs} />;
}

export function UnifiedStatsRoute() {
    const logs = useCheckins(s => s.logs);
    const testResults = useCognitive(s => s.results);
    const gymData = useBody(s => s.gym);
    return <UnifiedStats logs={logs} testResults={testResults} gymData={gymData} />;
}

export function ProgressRoute() {
    const logs = useCheckins(s => s.logs);
    const habits = useHabits(s => s.habits);
    const kanban = useTasks(s => s.kanban);
    const gymData = useBody(s => s.gym);
    const testResults = useCognitive(s => s.results);
    const diary = useJournal(s => s.entries);
    return (
        <Progress
            logs={logs} habits={habits} kanban={kanban} gymData={gymData}
            testResults={testResults} diary={diary}
        />
    );
}

export function AiPlanRoute() {
    const logs = useCheckins(s => s.logs);
    const kanban = useTasks(s => s.kanban);
    const setKanban = useTasks(s => s.setKanban);
    const habits = useHabits(s => s.habits);
    const gymData = useBody(s => s.gym);
    const testResults = useCognitive(s => s.results);
    const energy = useEnergy();
    return (
        <AiPlan
            logs={logs} kanban={kanban} setKanban={setKanban} habits={habits}
            gymData={gymData} testResults={testResults} energy={energy}
        />
    );
}

export function UserCardRoute() {
    const logs = useCheckins(s => s.logs);
    const setLogs = useCheckins(s => s.replaceAll);
    const diary = useJournal(s => s.entries);
    const habits = useHabits(s => s.habits);
    const kanban = useTasks(s => s.kanban);
    const goals = useTasks(s => s.goals);
    const gymData = useBody(s => s.gym);
    const testResults = useCognitive(s => s.results);
    const clinicalResults = useCognitive(s => s.clinical);
    const cbtRecords = useCognitive(s => s.cbt);
    const finance = useFinance(s => s.finance);
    return (
        <UserCard
            logs={logs} setLogs={setLogs} diary={diary} habits={habits} kanban={kanban}
            goals={goals} gymData={gymData} testResults={testResults}
            clinicalResults={clinicalResults} cbtRecords={cbtRecords}
            finance={finance}
        />
    );
}

export function CalendarRoute() {
    const logs = useCheckins(s => s.logs);
    const diary = useJournal(s => s.entries);
    const gymData = useBody(s => s.gym);
    const reminders = useCalendar(s => s.reminders);
    const setReminders = useCalendar(s => s.setReminders);
    return (
        <CalendarPage
            logs={logs} diary={diary} gymData={gymData}
            reminders={reminders} setReminders={setReminders}
        />
    );
}

export function ClinicalRoute() {
    const clinicalResults = useCognitive(s => s.clinical);
    const setClinicalResults = useCognitive(s => s.setClinical);
    const cbtRecords = useCognitive(s => s.cbt);
    const setCbtRecords = useCognitive(s => s.setCbt);
    return (
        <ClinicalTests
            clinicalResults={clinicalResults} setClinicalResults={setClinicalResults}
            cbtRecords={cbtRecords} setCbtRecords={setCbtRecords}
        />
    );
}

export function FinanceRoute() {
    const finance = useFinance(s => s.finance);
    const setFinance = useFinance(s => s.setFinance);
    return <Finance finance={finance} setFinance={setFinance} />;
}

export function GymRoute() {
    const gymData = useBody(s => s.gym);
    const setGymData = useBody(s => s.setGym);
    const logs = useCheckins(s => s.logs);
    return <GymApp gymData={gymData} setGymData={setGymData} logs={logs} />;
}
