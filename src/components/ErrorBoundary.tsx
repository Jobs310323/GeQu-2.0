import { Component, type ErrorInfo, type ReactNode } from 'react';
import i18next from 'i18next';

// `i18next.t` directly rather than `useTranslation`, and not because this is a
// class component — the fallback could easily be extracted into one. It is
// because this is the thing that renders when rendering has already failed. A
// hook here would add a Suspense boundary and a subscription to the one code
// path that must not have any: if the fallback itself throws, React remounts
// it, and it throws again. A plain function call cannot suspend.
const t = (key: string, params?: Record<string, string>) =>
    i18next.t(key, params as never) as unknown as string;

type Props = {
    children: ReactNode;
    /** Named in the fallback so the user knows what failed, and in the log line. */
    feature?: string | undefined;
    /** Rendered instead of the default fallback when supplied. */
    fallback?: ((error: Error, reset: () => void) => ReactNode) | undefined;
};

type State = { error: Error | null };

/**
 * Catches render errors from one subtree so a failure in a single feature
 * cannot blank the whole application.
 *
 * Wrap each feature route in one of these. The router's own `errorElement`
 * (see routes/RouteError.tsx) covers loader/action failures and anything this
 * boundary is mounted above; this one covers render errors inside the feature
 * and, unlike the route boundary, offers a retry that does not leave the page.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        // Console until Phase 12 wires up real error monitoring. Deliberately
        // logs only the feature name, message and stack — never the props or
        // state that produced it, which for this app would mean journal,
        // health and finance content.
        console.error(`[GeQu] ${this.props.feature ?? 'app'} failed to render`, error, info.componentStack);
    }

    private reset = () => this.setState({ error: null });

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        if (this.props.fallback) return this.props.fallback(error, this.reset);

        return (
            <div role="alert" className="glass-card rounded-2xl p-6 max-w-lg">
                <h2 className="text-lg font-medium mb-2">
                    {this.props.feature
                        ? t('common:error.featureFailed', { feature: this.props.feature })
                        : t('common:error.generic')}
                </h2>
                <p className="text-sm text-[var(--text-muted)] mb-4">
                    {t('common:error.body')}
                </p>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={this.reset}
                        className="px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 text-sm hover:bg-cyan-400/15 transition"
                    >
                        {t('common:action.retry')}
                    </button>
                    <a
                        href="/"
                        className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-white/5 transition"
                    >
                        {t('common:action.home')}
                    </a>
                </div>
                <details className="mt-4">
                    <summary className="text-xs text-[var(--text-muted)] cursor-pointer">{t('common:error.details')}</summary>
                    <pre className="mt-2 text-xs text-[var(--text-muted)] whitespace-pre-wrap break-words">
                        {error.message}
                    </pre>
                </details>
            </div>
        );
    }
}
