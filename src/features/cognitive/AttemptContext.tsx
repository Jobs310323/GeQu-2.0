import { useMemo } from 'react';
import type { TestResult } from '../../types/domain';
import { engineFor } from './registry';
import { historyFor, MIN_ATTEMPTS_FOR_PERCENTILE } from './scoring';

/**
 * What the last result actually means — or an honest statement that it does not
 * mean much yet.
 *
 * The exercises used to show a bare number and a personal best. That framing
 * quietly invites the reading "38 seconds is my attention span", which the data
 * cannot support: the score moves with screen size, pointer type, practice with
 * the grid, and how much the person hurried.
 *
 * So this card leads with the caveats, shows a comparison only when there is
 * enough history for one, and never compares the user to anybody else.
 */
export function AttemptContext({ testResults, type }: { testResults: TestResult[]; type: string | undefined }) {
    const engine = type ? engineFor(type) : undefined;

    const { latest, history } = useMemo(() => {
        if (!engine) return { latest: undefined, history: [] as number[] };
        const mine = testResults
            .filter(r => r.type === engine.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { latest: mine[0], history: historyFor(engine, testResults) };
    }, [engine, testResults]);

    if (!engine) return null;

    const attempts = history.length;
    const enough = attempts >= MIN_ATTEMPTS_FOR_PERCENTILE;

    return (
        <section aria-labelledby={`ctx-${engine.id}`} className="glass-card p-4 rounded-2xl mb-4">
            <h3 id={`ctx-${engine.id}`} className="t-label mb-2">Как это читать</h3>

            {latest === undefined ? (
                <p className="t-small text-[var(--gq-text-tertiary)]">
                    Ещё нет попыток. Первый результат станет точкой отсчёта — сравнивать его будет не с чем,
                    и это нормально.
                </p>
            ) : (
                <>
                    <p className="t-small">
                        Последний результат:{' '}
                        <b className="t-metric text-[var(--gq-text-primary)]">{latest.value}</b>{' '}
                        <span className="text-[var(--gq-text-tertiary)]">{engine.unit}</span>
                        {enough && latest.percentile !== undefined && (
                            <>
                                {' — лучше, чем '}
                                <b className="t-metric">{latest.percentile}%</b>
                                {' твоих же предыдущих попыток'}
                            </>
                        )}
                    </p>

                    {!enough && (
                        <p className="t-small text-[var(--gq-text-tertiary)] mt-1">
                            Попыток пока {attempts} из {MIN_ATTEMPTS_FOR_PERCENTILE}, нужных для сравнения.
                            До этого числа отдельный результат почти ничего не говорит — разброс между
                            попытками обычно больше, чем разница между «хорошим» и «плохим» днём.
                        </p>
                    )}
                </>
            )}

            <ul className="mt-3 pt-3 border-t border-[var(--border)] space-y-1">
                {engine.limitations.map(l => (
                    <li key={l} className="t-caption flex gap-2">
                        <span aria-hidden="true">·</span>
                        <span>{l}</span>
                    </li>
                ))}
                <li className="t-caption flex gap-2">
                    <span aria-hidden="true">·</span>
                    {/* The claim this whole module exists to avoid making. */}
                    <span>
                        Сравнение всегда только с твоими собственными попытками. Это не нормированный
                        тест — с другими людьми результат не сопоставляется.
                    </span>
                </li>
            </ul>
        </section>
    );
}
