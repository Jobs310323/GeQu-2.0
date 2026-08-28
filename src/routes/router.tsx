import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './AppLayout';
import { RouteError } from './RouteError';
import { NotFound } from './NotFound';
import * as R from './pages';

/**
 * One route per screen, each a separate chunk.
 *
 * `/` is the dashboard rather than a redirect so the PWA start URL and a
 * bookmark of the bare origin both land somewhere real. Phase 4 replaces this
 * index with the Today surface and re-parents the rest under
 * Today / Plan / Track / Insights / Brain / Profile; the legacy paths below
 * stay as redirects at that point, which is why they are flat ids now.
 */
export const router = createBrowserRouter([
    {
        path: '/',
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
            { index: true, element: <R.DashboardRoute /> },
            { path: 'dashboard', element: <Navigate to="/" replace /> },

            { path: 'aiplan', element: <R.AiPlanRoute /> },
            { path: 'calendar', element: <R.CalendarRoute /> },
            { path: 'habits', element: <R.HabitsRoute /> },
            { path: 'snowman', element: <R.SnowmanRoute /> },

            { path: 'kanban', element: <R.KanbanRoute /> },
            { path: 'goals', element: <R.GoalsRoute /> },
            { path: 'mindmap', element: <R.MindMapRoute /> },
            { path: 'diary', element: <R.DiaryRoute /> },

            { path: 'finance', element: <R.FinanceRoute /> },

            { path: 'gym', element: <R.GymRoute /> },
            { path: 'training', element: <R.TrainingRoute /> },
            { path: 'circles', element: <R.CirclesRoute /> },
            { path: 'clinical', element: <R.ClinicalRoute /> },

            { path: 'progress', element: <R.ProgressRoute /> },
            { path: 'hub', element: <R.UnifiedStatsRoute /> },

            { path: 'knowledge', element: <R.KnowledgeRoute /> },

            { path: 'card', element: <R.UserCardRoute /> },
            { path: 'settings', element: <R.SettingsRoute /> },

            { path: '*', element: <NotFound /> },
        ],
    },
]);
