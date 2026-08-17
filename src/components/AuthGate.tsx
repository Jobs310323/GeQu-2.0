import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Logo } from './Logo';
import { enterGuestMode } from '../lib/guest';

/**
 * Shown instead of the app when nobody is signed in. Clerk's prebuilt forms
 * handle the actual auth flow (password, OAuth, email code, etc. depending on
 * what's enabled in the Clerk dashboard) — this just frames them in the app's
 * own dark, desaturated look.
 */
export function AuthGate({ onGuest }: { onGuest: () => void }) {
    const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-main)] p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center mb-8">
                    <Logo />
                </div>

                <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1 max-w-[280px] mx-auto">
                    <button
                        onClick={() => setMode('sign-in')}
                        className={`flex-1 px-4 py-2 rounded-xl text-sm transition ${
                            mode === 'sign-in' ? 'bg-cyan-400/10 text-cyan-400 font-medium' : 'text-[var(--text-muted)] hover:bg-white/5'
                        }`}
                    >
                        Вход
                    </button>
                    <button
                        onClick={() => setMode('sign-up')}
                        className={`flex-1 px-4 py-2 rounded-xl text-sm transition ${
                            mode === 'sign-up' ? 'bg-cyan-400/10 text-cyan-400 font-medium' : 'text-[var(--text-muted)] hover:bg-white/5'
                        }`}
                    >
                        Регистрация
                    </button>
                </div>

                <div className="flex justify-center">
                    {mode === 'sign-in'
                        ? <SignIn routing="virtual" signUpUrl="#" appearance={CLERK_APPEARANCE} />
                        : <SignUp routing="virtual" signInUrl="#" appearance={CLERK_APPEARANCE} />}
                </div>

                <button
                    onClick={() => { enterGuestMode(); onGuest(); }}
                    className="block mx-auto mt-6 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] underline underline-offset-2"
                >
                    Продолжить как гость (без сохранения в облако)
                </button>
            </div>
        </div>
    );
}

const CLERK_APPEARANCE = {
    variables: {
        colorPrimary: '#7E9AAB',
        colorBackground: 'transparent',
        colorText: '#E3E5E9',
        colorTextSecondary: '#868C99',
        colorInputBackground: 'rgba(255,255,255,0.035)',
        colorInputText: '#E3E5E9',
        borderRadius: '0.75rem',
    },
    elements: {
        card: 'shadow-none bg-transparent w-full',
        headerTitle: 'text-[var(--text-main)]',
        headerSubtitle: 'text-[var(--text-muted)]',
        socialButtonsBlockButton: 'border-[var(--border)]',
        dividerLine: 'bg-[var(--border)]',
        dividerText: 'text-[var(--text-muted)]',
        formFieldInput: 'border-[var(--border)]',
        footer: 'hidden',
    },
};
