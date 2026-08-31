import { Link } from 'react-router';
import { Icon } from '../../components/Icons';
import { useCheckins } from '../../stores/checkins.store';
import { allInsights, CLAIM_LABEL, MIN_SAMPLE } from '../insights/engine';
import { toLocalDateKey } from '../../lib/datetime';

/**
 * "What did I learn about myself" — one observation, or an honest nothing.
 *
 * When there is not enough data the card says so and points at the way to get
 * some, rather than manufacturing a finding out of three days.
 */
export function TodayInsight() {
    const logs = useCheckins(s => s.logs);

    /* One insight, rotated by day.
     *
     * The engine produces several; showing all of them turns Today into a
     * report, and a report is something to read later rather than notice now.
     * Rotating by date keeps the card stable within a day — a card that changes
     * under the user mid-afternoon reads as noise, not information. */
    const insights = allInsights(logs);
    const dayIndex = Number(toLocalDateKey(new Date()).replaceAll('-', ''));
    const observation = insights.length
        ? insights[dayIndex % insights.length] ?? insights[0]
        : null;

    return (
        <section aria-labelledby="today-insight" className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
                <h2 id="today-insight" className="t-small font-medium text-[var(--gq-text-tertiary)]">
                    О тебе
                </h2>
                {observation && (
                    <Link to="/insights/progress" className="t-caption text-cyan-400 hover:underline">
                        Больше выводов
                    </Link>
                )}
            </div>

            {observation ? (
                <div className="glass-card rounded-2xl p-4">
                    <div className="flex gap-3">
                        <Icon name="sparkle" size={16} className="text-purple-400 shrink-0 mt-0.5" />
                        <p className="t-small leading-relaxed flex-1">{observation.text}</p>
                    </div>
                    <p className="t-caption text-[11px] mt-3 pt-3 border-t border-[var(--border)]">
                        {/* Everything needed to judge the sentence above it: what kind
                            of claim it is, and how much data stands behind it. An
                            insight that cannot say this does not render at all. */}
                        {CLAIM_LABEL[observation.claim]} · {observation.sampleSize}{' '}
                        {dayWord(observation.sampleSize)} в выборке
                        {observation.effectSize !== undefined && (
                            <> · разница примерно в {observation.effectSize.toFixed(1)}× твоего обычного разброса</>
                        )}
                    </p>
                </div>
            ) : (
                <div className="glass-card rounded-2xl p-4">
                    <p className="t-small text-[var(--gq-text-tertiary)] leading-relaxed">
                        Пока мало данных для выводов — нужно хотя бы {MIN_SAMPLE} оценённых дней с каждой стороны
                        сравнения.
                    </p>
                    <Link
                        to="/today/checkin"
                        className="inline-flex items-center gap-1.5 t-caption text-cyan-400 hover:underline mt-2"
                    >
                        <Icon name="moon" size={12} />
                        Оценить сегодняшний день
                    </Link>
                </div>
            )}
        </section>
    );
}

const dayWord = (n: number) => {
    const form = new Intl.PluralRules('ru-RU').select(n);
    return form === 'one' ? 'день' : form === 'few' ? 'дня' : 'дней';
};
