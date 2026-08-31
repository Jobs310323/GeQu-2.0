import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { Sidebar } from '../components/Sidebar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { HyperfocusOverlay } from '../features/hyperfocus/HyperfocusOverlay';
import { DopamineRoulette } from '../features/dopamine/DopamineRoulette';
import { RouteFallback } from './RouteFallback';
import { BottomNav } from '../components/BottomNav';
import { CommandPalette } from '../features/capture/CommandPalette';
import { findByPath } from '../lib/nav';
import { useAppUi } from '../stores/app-ui.store';
import { useTasks } from '../stores/tasks.store';
import { useJournal } from '../stores/journal.store';
import { useCheckins } from '../stores/checkins.store';
import { useCalendar, selectUpcomingCount } from '../stores/calendar.store';
import { useEnergy, useLevelInfo, useTodayLog } from '../stores/derived';

/**
 * The shell every route renders inside: navigation, the app-level overlays that
 * must survive navigation, and the outlet.
 *
 * The error boundary is keyed by pathname so navigating away from a screen that
 * threw clears the error — otherwise a single failure would pin the user on the
 * fallback until a full reload.
 */
export function AppLayout() {
    const location = useLocation();
    const feature = findByPath(location.pathname)?.label;

    const theme = useAppUi(s => s.theme);
    const setTheme = useAppUi(s => s.setTheme);
    const prefs = useAppUi(s => s.prefs);
    const hyperfocus = useAppUi(s => s.hyperfocus);
    const setHyperfocus = useAppUi(s => s.setHyperfocus);
    const rouletteOpen = useAppUi(s => s.rouletteOpen);
    const setRouletteOpen = useAppUi(s => s.setRouletteOpen);
    const dopamineMenu = useAppUi(s => s.dopamineMenu);
    const setDopamineMenu = useAppUi(s => s.setDopamineMenu);

    const kanban = useTasks(s => s.kanban);
    const setKanban = useTasks(s => s.setKanban);
    const setDiary = useJournal(s => s.setEntries);
    const setLogs = useCheckins(s => s.replaceAll);

    const reminderCount = useCalendar(selectUpcomingCount);
    const energy = useEnergy();
    const levelInfo = useLevelInfo();
    const todayLog = useTodayLog();

    useEffect(() => {
        // Toggle only the theme classes. Assigning to `className` here used to
        // replace the whole list, silently dropping anything else on <html>.
        document.documentElement.classList.toggle('light', theme === 'light');
        document.documentElement.classList.toggle('dark', theme !== 'light');
    }, [theme]);

    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar
                theme={theme} setTheme={setTheme} energy={energy} todayLog={todayLog}
                prefs={prefs} levelInfo={levelInfo}
                onRoulette={() => setRouletteOpen(true)}
                reminderCount={reminderCount}
            />

            {/* pb-20 on small screens keeps the last row clear of the bottom bar. */}
            <main id="main" className="flex-1 p-4 sm:p-6 pb-20 md:pb-6 overflow-y-auto relative">
                <ErrorBoundary key={location.pathname} feature={feature}>
                    <Suspense fallback={<RouteFallback />}>
                        <Outlet />
                    </Suspense>
                </ErrorBoundary>
            </main>

            <BottomNav />
            <CommandPalette />

            {hyperfocus && (
                <HyperfocusOverlay
                    hyperfocus={hyperfocus} setHyperfocus={setHyperfocus}
                    kanban={kanban} setDiary={setDiary} setLogs={setLogs} todayLog={todayLog}
                />
            )}

            {rouletteOpen && (
                <DopamineRoulette
                    kanban={kanban} setKanban={setKanban}
                    dopamineMenu={dopamineMenu} setDopamineMenu={setDopamineMenu}
                    energy={energy}
                    onClose={() => setRouletteOpen(false)}
                />
            )}
        </div>
    );
}
