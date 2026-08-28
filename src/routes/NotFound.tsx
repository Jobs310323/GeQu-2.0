import { Link } from 'react-router';

export function NotFound() {
    return (
        <div className="glass-card rounded-2xl p-6 max-w-lg">
            <h1 className="text-lg font-medium mb-2">Страница не найдена</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">
                Такого раздела нет. Возможно, ссылка устарела.
            </p>
            <Link
                to="/"
                className="inline-block px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 text-sm hover:bg-cyan-400/15 transition"
            >
                На главную
            </Link>
        </div>
    );
}
