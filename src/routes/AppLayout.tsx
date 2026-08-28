import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HyperfocusOverlay } from '../features/hyperfocus/HyperfocusOverlay';
import { DopamineRoulette } from '../features/dopamine/DopamineRoulette';
import { useAppState } from '../app/AppState';
import { RouteFallback } from './RouteFallback';
import { findByPath } from '../lib/nav';

/**
 * The shell every route renders inside: navigation, the app-level overlays that
 * must survive navigation, and the outlet.
 *
 * The error boundary is keyed by pathname so navigating away from a screen that
 * threw clears the error — otherwise a single failure would pin the user on the
 * fallback until a full reload.
 */
export function AppLayout() {
    const s = useAppState();
    const location = useLocation();
    const feature = findByPath(location.pathname)?.label;

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                theme={s.theme} setTheme={s.setTheme} energy={s.energy} todayLog={s.todayLog}
                prefs={s.prefs} levelInfo={s.levelInfo}
                onRoulette={() => s.setRouletteOpen(true)}
                reminderCount={s.reminderCount}
            />

            <main id="main" className="flex-1 p-6 overflow-y-auto relative">
                <ErrorBoundary key={location.pathname} feature={feature}>
                    <Suspense fallback={<RouteFallback />}>
                        <Outlet />
                    </Suspense>
                </ErrorBoundary>
            </main>

            {s.hyperfocus && (
                <HyperfocusOverlay
                    hyperfocus={s.hyperfocus} setHyperfocus={s.setHyperfocus}
                    kanban={s.kanban} setDiary={s.setDiary} setLogs={s.setLogs} todayLog={s.todayLog}
                />
            )}

            {s.rouletteOpen && (
                <DopamineRoulette
                    kanban={s.kanban} setKanban={s.setKanban}
                    dopamineMenu={s.dopamineMenu} setDopamineMenu={s.setDopamineMenu}
                    energy={s.energy}
                    onClose={() => s.setRouletteOpen(false)}
                />
            )}
        </div>
    );
}
