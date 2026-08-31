import { useState } from 'react';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { RouterProvider } from 'react-router';
import { CloudSync } from './components/CloudSync';
import { AuthGate } from './components/AuthGate';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PomodoroTicker } from './app/Pomodoro';
import { Onboarding, hasOnboarded } from './features/onboarding/Onboarding';
import { router } from './routes/router';

/**
 * Gates the whole app behind auth: each account only ever sees its own data.
 *
 * Domain state lives in `src/stores/`, hydrated from storage at import; the one
 * piece of state here decides whether the user sees onboarding or the app. The
 * outermost ErrorBoundary is the last line of defence: routes have their own,
 * so reaching this one means the shell itself failed.
 */
function App() {
    // Checked once per mount rather than subscribed: onboarding runs at most
    // once, and `onDone` flips this without a reload.
    const [onboarded, setOnboarded] = useState(hasOnboarded);

    return (
        <>
            <SignedIn>
                <ErrorBoundary>
                    <CloudSync />
                    <PomodoroTicker />
                    {onboarded
                        ? <RouterProvider router={router} />
                        : <Onboarding onDone={() => setOnboarded(true)} />}
                </ErrorBoundary>
            </SignedIn>
            <SignedOut>
                <AuthGate />
            </SignedOut>
        </>
    );
}

export default App;
