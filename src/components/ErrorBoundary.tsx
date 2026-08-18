import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; label?: string; onReset?: () => void };
type State = { error: Error | null };

/**
 * Keeps one broken page from taking the app down with it.
 *
 * Every byte the user has typed lives in localStorage, untouched by whatever
 * just threw — but a white screen reads as "my data is gone", which for this
 * app is the worst thing it could say. So the boundary says so out loud, keeps
 * the sidebar alive, and offers the two ways out: try the page again, or go
 * back to the dashboard.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[GeQu] Раздел упал:', error, info.componentStack);
    }

    /** Remount the subtree; a page that threw on stale props may well survive. */
    private retry = () => this.setState({ error: null });

    private home = () => {
        this.setState({ error: null });
        this.props.onReset?.();
    };

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;

        return (
            <div className="gq-glass p-6 max-w-lg mx-auto mt-10">
                <h2 className="gq-display text-lg font-bold mb-2" style={{ color: 'var(--gq-bad-strong)' }}>
                    {this.props.label ? `Раздел «${this.props.label}» не открылся` : 'Что-то сломалось'}
                </h2>
                <p className="text-sm mb-1" style={{ color: 'var(--gq-text-2)' }}>
                    Твои данные на месте — они хранятся отдельно и от этой ошибки не пострадали.
                </p>
                <p className="text-xs gq-muted mb-4">{error.message}</p>
                <div className="flex gap-2 flex-wrap">
                    <button className="gq-btn" onClick={this.retry}>Попробовать снова</button>
                    {this.props.onReset && (
                        <button className="gq-chip" onClick={this.home}>Вернуться на дашборд</button>
                    )}
                </div>
            </div>
        );
    }
}
