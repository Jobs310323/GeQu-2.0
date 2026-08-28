import { isRouteErrorResponse, useRouteError, useNavigate } from 'react-router';

/**
 * The router's `errorElement`. Handles anything thrown while resolving or
 * rendering a route — including a lazy chunk that fails to load, which is the
 * common case offline or straight after a deploy.
 */
export function RouteError() {
    const error = useRouteError();
    const navigate = useNavigate();

    const isChunkError =
        error instanceof Error && /dynamically imported module|Failed to fetch/i.test(error.message);

    const title = isRouteErrorResponse(error)
        ? `${error.status} — ${error.statusText}`
        : isChunkError
            ? 'Не удалось загрузить раздел'
            : 'Раздел не открылся';

    const detail = isChunkError
        ? 'Похоже, нет соединения — или приложение обновилось, пока эта вкладка была открыта. Перезагрузка обычно решает это.'
        : 'Остальное приложение работает. Можно вернуться на главную и попробовать снова.';

    return (
        <div role="alert" className="glass-card rounded-2xl p-6 max-w-lg">
            <h1 className="text-lg font-medium mb-2">{title}</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">{detail}</p>
            <div className="flex flex-wrap gap-2">
                {isChunkError && (
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 text-sm hover:bg-cyan-400/15 transition"
                    >
                        Перезагрузить
                    </button>
                )}
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm hover:bg-white/5 transition"
                >
                    На главную
                </button>
            </div>
        </div>
    );
}
