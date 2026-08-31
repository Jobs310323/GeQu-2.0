import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { RouteError } from './RouteError';
import { NotFound } from './NotFound';
import { LEGACY_PATHS } from '../lib/nav';
import * as R from './pages';

/**
 * The route tree, shaped by the six sections in lib/nav.ts.
 *
 * `/` is the Today surface rather than a redirect, so the PWA start URL and a
 * bookmark of the bare origin both land on the screen the product is built
 * around.
 *
 * Every pre-2.0 path redirects rather than 404ing: bookmarks, the old PWA start
 * URL and the knowledge base's internal links all still point at them.
 */
const legacyRedirects = Object.entries(LEGACY_PATHS).map(([from, to]) => ({
    path: from.slice(1),
    element: <Navigate to={to} replace />,
}));

export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
            { index: true, element: <R.TodayRoute /> },

            { path: 'today/checkin', element: <R.CheckinRoute /> },
            { path: 'today/plan', element: <R.AiPlanRoute /> },
            { path: 'today', element: <Navigate to="/" replace /> },

            { path: 'plan/tasks', element: <R.KanbanRoute /> },
            { path: 'plan/goals', element: <R.GoalsRoute /> },
            { path: 'plan/map', element: <R.MindMapRoute /> },
            { path: 'plan/calendar', element: <R.CalendarRoute /> },
            { path: 'plan', element: <Navigate to="/plan/tasks" replace /> },

            { path: 'track/habits', element: <R.HabitsRoute /> },
            { path: 'track/journal', element: <R.DiaryRoute /> },
            { path: 'track/body', element: <R.GymRoute /> },
            { path: 'track/balance', element: <R.SnowmanRoute /> },
            { path: 'track/finance', element: <R.FinanceRoute /> },
            { path: 'track', element: <Navigate to="/track/habits" replace /> },

            { path: 'insights/progress', element: <R.ProgressRoute /> },
            { path: 'insights/stats', element: <R.UnifiedStatsRoute /> },
            { path: 'insights', element: <Navigate to="/insights/progress" replace /> },

            { path: 'brain/train', element: <R.TrainingRoute /> },
            { path: 'brain/assess', element: <R.ClinicalRoute /> },
            { path: 'brain/reflect', element: <R.CirclesRoute /> },
            { path: 'brain/learn', element: <R.KnowledgeRoute /> },
            { path: 'brain', element: <Navigate to="/brain/train" replace /> },

            { path: 'profile', element: <R.UserCardRoute /> },
            { path: 'profile/settings', element: <R.SettingsRoute /> },

            ...legacyRedirects,

            { path: '*', element: <NotFound /> },
        ],
    },
]);
