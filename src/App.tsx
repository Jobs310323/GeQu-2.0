import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { RouterProvider } from 'react-router';
import { CloudSync } from './components/CloudSync';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PomodoroTicker } from './app/Pomodoro';
import { router } from './routes/router';

/**
 * Gates the whole app behind auth: each account only ever sees its own data.
 *
 * There is no state here — domain state lives in `src/stores/`, hydrated from
 * storage at import. The outermost ErrorBoundary is the last line of defence:
 * routes have their own, so reaching this one means the shell itself failed.
 */
function App() {
    return (
        <>
            <SignedIn>
                <ErrorBoundary>
                    <CloudSync />
                    <PomodoroTicker />
                    <RouterProvider router={router} />
                </ErrorBoundary>
            </SignedIn>
            <SignedOut>
                <AuthGate />
            </SignedOut>
        </>
    );
}

export default App;
