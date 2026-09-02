import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export function NotFound() {
    const { t } = useTranslation('common');
    return (
        <div className="glass-card rounded-2xl p-6 max-w-lg">
            <h1 className="text-lg font-medium mb-2">{t('common:error.notFoundTitle')}</h1>
            <p className="text-sm text-[var(--text-muted)] mb-4">
                {t('common:error.notFoundBody')}
            </p>
            <Link
                to="/"
                className="inline-block px-4 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 text-sm hover:bg-cyan-400/15 transition"
            >
                {t('common:action.home')}
            </Link>
        </div>
    );
}
