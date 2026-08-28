import { lazy, type ComponentType } from 'react';
import { useAppState } from '../app/AppState';

// Every page is a separate chunk. The adapter components below are the only
// place that knows how a page wants its data — so when Phase 3 replaces the
// state provider with per-domain stores, the pages themselves stay untouched
// and only these adapters change.

// Pages are still untyped internally (`({ ... }: any)`), so the loaded component
// is typed as accepting any props. Phase 2 gives each page a real prop
// interface, at which point this widens no further than the page itself does.
const load = (name: string, importer: () => Promise<Record<string, unknown>>) =>
    lazy(async () => ({ default: (await importer())[name] as ComponentType<any> }));

const Dashboard = load('Dashboard', () => import('../pages/Dashboard'));
const Kanban = load('Kanban', () => import('../pages/Kanban'));
const Habits = load('Habits', () => import('../pages/Habits'));
const Goals = load('Goals', () => import('../pages/Goals'));
const MindMap = load('MindMap', () => import('../pages/MindMap'));
const Diary = load('Diary', () => import('../pages/Diary'));
const Training = load('Training', () => import('../pages/Training'));
const Knowledge = load('Knowledge', () => import('../pages/Knowledge'));
const Settings = load('Settings', () => import('../pages/Settings'));
const UnifiedStats = load('UnifiedStats', () => import('../pages/UnifiedStats'));
const Progress = load('Progress', () => import('../pages/Progress'));
const AiPlan = load('AiPlan', () => import('../pages/AiPlan'));
const UserCard = load('UserCard', () => import('../pages/UserCard'));
const CalendarPage = load('CalendarPage', () => import('../pages/CalendarPage'));
const ClinicalTests = load('ClinicalTests', () => import('../pages/ClinicalTests'));
const CirclesOfInfluence = load('CirclesOfInfluence', () => import('../pages/CirclesOfInfluence'));
const Finance = load('Finance', () => import('../pages/Finance'));
const GymApp = load('GymApp', () => import('../features/gym/Gym'));
const Snowman = load('Snowman', () => import('../features/snowman/Snowman'));

export function DashboardRoute() {
    const s = useAppState();
    return (
        <Dashboard
            logs={s.logs} setLogs={s.setLogs} achievements={s.achievements} setHyperfocus={s.setHyperfocus}
            kanban={s.kanban} gymData={s.gymData} testResults={s.testResults} prefs={s.prefs}
            habits={s.habits} setHabits={s.setHabits} levelInfo={s.levelInfo} energy={s.energy}
        />
    );
}

export function KanbanRoute() {
    const s = useAppState();
    return <Kanban kanban={s.kanban} setKanban={s.setKanban} />;
}

export function HabitsRoute() {
    const s = useAppState();
    return <Habits habits={s.habits} setHabits={s.setHabits} />;
}

export function GoalsRoute() {
    const s = useAppState();
    return <Goals goals={s.goals} setGoals={s.setGoals} />;
}

export function MindMapRoute() {
    return <MindMap />;
}

export function DiaryRoute() {
    const s = useAppState();
    return <Diary diary={s.diary} setDiary={s.setDiary} />;
}

export function TrainingRoute() {
    const s = useAppState();
    return (
        <Training
            setTestResults={s.setTestResults} testResults={s.testResults}
            achievements={s.achievements} setAchievements={s.setAchievements}
            pomodoro={s.pomodoro} setPomodoro={s.setPomodoro}
        />
    );
}

export function KnowledgeRoute() {
    return <Knowledge />;
}

export function SettingsRoute() {
    const s = useAppState();
    return <Settings diary={s.diary} logs={s.logs} prefs={s.prefs} setPrefs={s.setPrefs} />;
}

export function UnifiedStatsRoute() {
    const s = useAppState();
    return <UnifiedStats logs={s.logs} testResults={s.testResults} gymData={s.gymData} />;
}

export function ProgressRoute() {
    const s = useAppState();
    return (
        <Progress
            logs={s.logs} habits={s.habits} kanban={s.kanban} gymData={s.gymData}
            testResults={s.testResults} diary={s.diary} snowmanDays={s.snowmanDays}
        />
    );
}

export function AiPlanRoute() {
    const s = useAppState();
    return (
        <AiPlan
            logs={s.logs} kanban={s.kanban} setKanban={s.setKanban} habits={s.habits}
            gymData={s.gymData} testResults={s.testResults} energy={s.energy}
        />
    );
}

export function UserCardRoute() {
    const s = useAppState();
    return (
        <UserCard
            logs={s.logs} setLogs={s.setLogs} diary={s.diary} habits={s.habits} kanban={s.kanban}
            goals={s.goals} gymData={s.gymData} testResults={s.testResults}
            clinicalResults={s.clinicalResults} cbtRecords={s.cbtRecords}
            finance={s.finance} circles={s.circles}
        />
    );
}

export function CalendarRoute() {
    const s = useAppState();
    return (
        <CalendarPage
            logs={s.logs} diary={s.diary} gymData={s.gymData}
            reminders={s.reminders} setReminders={s.setReminders}
        />
    );
}

export function ClinicalRoute() {
    const s = useAppState();
    return (
        <ClinicalTests
            clinicalResults={s.clinicalResults} setClinicalResults={s.setClinicalResults}
            cbtRecords={s.cbtRecords} setCbtRecords={s.setCbtRecords}
        />
    );
}

export function CirclesRoute() {
    const s = useAppState();
    return <CirclesOfInfluence circles={s.circles} setCircles={s.setCircles} />;
}

export function FinanceRoute() {
    const s = useAppState();
    return <Finance finance={s.finance} setFinance={s.setFinance} />;
}

export function GymRoute() {
    const s = useAppState();
    return <GymApp gymData={s.gymData} setGymData={s.setGymData} logs={s.logs} />;
}

export function SnowmanRoute() {
    const s = useAppState();
    return (
        <Snowman
            labels={s.snowmanLabels} setLabels={s.setSnowmanLabels}
            days={s.snowmanDays} setDays={s.setSnowmanDays}
        />
    );
}
