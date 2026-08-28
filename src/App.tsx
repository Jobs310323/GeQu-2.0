import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { RouterProvider } from 'react-router';
import { CloudSync } from './components/CloudSync';
import { AuthGate } from './components/AuthGate';
import { AppStateProvider } from './app/AppState';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes/router';

/**
 * Gates the whole app behind auth: each account only ever sees its own data.
 *
 * Everything below the gate is assembled here and nowhere else — state, then
 * routing. The outermost ErrorBoundary is the last line of defence: routes have
 * their own, so reaching this one means the shell itself failed.
 */
function App() {
    return (
        <>
            <SignedIn>
                <ErrorBoundary>
                    <CloudSync />
                    <AppStateProvider>
                        <RouterProvider router={router} />
                    </AppStateProvider>
                </ErrorBoundary>
            </SignedIn>
            <SignedOut>
                <AuthGate />
            </SignedOut>
        </>
    );
}

export default App;
