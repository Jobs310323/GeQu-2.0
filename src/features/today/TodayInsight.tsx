import { Link } from 'react-router';
import { Icon } from '../../components/Icons';
import { useCheckins } from '../../stores/checkins.store';
import { todaysObservation, MIN_SAMPLE } from '../insights/observe';

/**
 * "What did I learn about myself" — one observation, or an honest nothing.
 *
 * When there is not enough data the card says so and points at the way to get
 * some, rather than manufacturing a finding out of three days.
 */
export function TodayInsight() {
    const logs = useCheckins(s => s.logs);
    const observation = todaysObservation(logs);

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
                        {observation.sampleSize} {dayWord(observation.sampleSize)} в выборке. Это наблюдаемая связь,
                        а не доказанная причина.
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
