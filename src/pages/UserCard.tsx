import { useState, useEffect } from 'react';
import { callAIJson } from '../lib/ai';
import { DB } from '../lib/db';
import { buildProfile, hasEnoughData } from '../lib/profile';

type AiCard = {
    headline?: string;
    summary?: string;
    strengths?: string[];
    challenges?: string[];
    patterns?: string[];
    cognitiveProfile?: string;
    recommendations?: string[];
};

const CARD_SYSTEM = `Ты — внимательный аналитик в приложении GeQu. Пользователь — человек с СДВГ, ведёт дневник, трекает состояние, проходит когнитивные тесты и тренируется.

Тебе дают JSON с точной агрегированной статистикой (средние по сну/фокусу/настроению, теги «что помогло/помешало», привычки, задачи, зал, динамика когнитивных тестов, выдержки из дневника, уровень и ачивки). Числа уже посчитаны — НЕ пересчитывай их и не выдумывай новых.

Составь подробную карточку пользователя: кто он по этим данным, что у него получается, где узкие места, какие видны закономерности.

Важно:
- В cognitive учитывай поле lowerIsBetter: для времени и реакции меньше = лучше. improvedPct > 0 означает улучшение.
- Опирайся только на предоставленные данные. Если данных мало — скажи об этом честно, не фантазируй.
- Никаких диагнозов и медицинских выводов. Ты не врач.
- Обращайся на «ты», тепло и по делу, без лести и общих фраз.

Отвечай СТРОГО одним JSON-объектом:
{"headline": "короткая ёмкая характеристика в одну строку", "summary": "2–4 предложения общего портрета", "strengths": ["сильная сторона с опорой на цифру"], "challenges": ["узкое место с опорой на цифру"], "patterns": ["замеченная закономерность, например связь сна и фокуса"], "cognitiveProfile": "2–3 предложения про когнитивные тесты и динамику", "recommendations": ["конкретное выполнимое действие"]}

Массивы — по 2–4 пункта. Всё по-русски. Никакого текста вне JSON.`;

function Stat({ label, value, hint }: { label: string; value: any; hint?: string }) {
    return (
        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
            {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
        </div>
    );
}

function Section({ title, items, icon, tone }: { title: string; items?: string[]; icon: string; tone: string }) {
    if (!items?.length) return null;
    return (
        <div className="glass-card p-5 rounded-2xl">
            <h3 className={`font-bold mb-3 ${tone}`}>{icon} {title}</h3>
            <ul className="space-y-2">
                {items.map((t, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className={tone}>•</span><span>{t}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function UserCard({ logs, diary, habits, kanban, goals, gymData, testResults }: any) {
    const [card, setCard] = useState<AiCard | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [madeAt, setMadeAt] = useState('');

    const profile = buildProfile({ logs, diary, habits, kanban, goals, gymData, testResults });
    const enough = hasEnoughData(profile);

    useEffect(() => {
        const cached = DB.get('usercard', null);
        if (cached?.card) { setCard(cached.card); setMadeAt(cached.madeAt || ''); }
    }, []);

    const generate = async () => {
        setLoading(true); setError('');
        try {
            const result = await callAIJson<AiCard>({
                system: CARD_SYSTEM,
                prompt: `Вот моя статистика (JSON):\n\n${JSON.stringify(profile)}\n\nСоставь мою карточку.`,
                maxTokens: 2000,
            });
            const stamp = new Date().toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            setCard(result); setMadeAt(stamp);
            DB.save('usercard', { card: result, madeAt: stamp });
        } catch (e: any) {
            setError(e?.message || 'Не удалось составить карточку.');
        } finally {
            setLoading(false);
        }
    };

    const s = profile.state;
    const trendText = (t: any) =>
        t.improvedPct === null ? 'мало данных'
            : t.improvedPct > 0 ? `↑ лучше на ${t.improvedPct}%`
            : t.improvedPct < 0 ? `↓ хуже на ${Math.abs(t.improvedPct)}%`
            : 'без изменений';

    return (
        <div className="max-w-5xl">
            <h1 className="text-3xl font-bold mb-2">Карточка пользователя</h1>
            <p className="text-gray-400 text-sm mb-6">
                Сводка по всем твоим данным: состояние, привычки, задачи, зал, когнитивные тесты и дневник.
            </p>

            {!enough ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    Пока нет данных для карточки. Закрой первый день, пройди тест или сделай запись в дневнике.
                </div>
            ) : (
                <>
                    {/* Factual layer — always available, no AI or network needed */}
                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                            <h2 className="text-xl font-bold">📇 Факты</h2>
                            <span className="text-xs text-gray-500">
                                {profile.period.firstEntry
                                    ? `${profile.period.firstEntry} — ${profile.period.lastEntry} · ${profile.period.daysTracked} записей`
                                    : 'нет закрытых дней'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <Stat label="Уровень" value={profile.gamification.level} hint={`${profile.gamification.xp} XP`} />
                            <Stat label="Серия" value={`${s.currentStreak} дн.`} hint="подряд закрытых" />
                            <Stat label="Ачивки" value={`${profile.gamification.achievementsUnlocked.length}/${profile.gamification.achievementsTotal}`} />
                            <Stat label="Дневник" value={profile.journal.entries} hint={`+${profile.journal.gratitudeEntries} благодарностей`} />
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <Stat label="Сон (30 дн.)" value={s.last30Days.sleep || '—'} hint={`за всё время ${s.allTime.sleep || '—'}`} />
                            <Stat label="Фокус (30 дн.)" value={s.last30Days.focus || '—'} hint={`за всё время ${s.allTime.focus || '—'}`} />
                            <Stat label="Настроение (30 дн.)" value={s.last30Days.mood || '—'} hint={`за всё время ${s.allTime.mood || '—'}`} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Stat label="Задачи закрыто" value={profile.tasks.done} hint={`${profile.tasks.todo} в очереди`} />
                            <Stat label="Тренировки" value={profile.gym.workouts} hint={`${profile.gym.totalTonnageKg.toLocaleString('ru-RU')} кг тоннаж`} />
                            <Stat label="Тестов пройдено" value={profile.cognitive.reduce((a, t) => a + t.count, 0)} hint={`${profile.cognitive.length} видов`} />
                            <Stat label="Привычек" value={profile.habits.length} hint={`${profile.habits.reduce((a, h) => a + h.done, 0)} отметок`} />
                        </div>

                        {(profile.helpedTop.length > 0 || profile.hinderedTop.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
                                {profile.helpedTop.length > 0 && (
                                    <div>
                                        <div className="text-sm text-gray-400 mb-2">Чаще всего помогало</div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.helpedTop.map(t => (
                                                <span key={t.tag} className="text-xs px-2 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">
                                                    {t.tag} · {t.n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {profile.hinderedTop.length > 0 && (
                                    <div>
                                        <div className="text-sm text-gray-400 mb-2">Чаще всего мешало</div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.hinderedTop.map(t => (
                                                <span key={t.tag} className="text-xs px-2 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">
                                                    {t.tag} · {t.n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {profile.cognitive.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-[var(--border)]">
                                <div className="text-sm text-gray-400 mb-2">Когнитивная динамика</div>
                                <div className="space-y-2">
                                    {profile.cognitive.map(t => (
                                        <div key={t.type} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--bg-input)] px-3 py-2 rounded-lg border border-[var(--border)]">
                                            <span className="text-sm text-gray-300 flex-1 min-w-[160px]">{t.label}</span>
                                            <span className="text-xs text-gray-500">{t.count} раз</span>
                                            <span className="text-xs text-gray-400 tabular-nums">лучший {t.best}</span>
                                            <span className={`text-xs font-bold ${
                                                t.improvedPct === null ? 'text-gray-500'
                                                    : t.improvedPct > 0 ? 'text-green-400'
                                                    : t.improvedPct < 0 ? 'text-red-400' : 'text-gray-400'
                                            }`}>{trendText(t)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* AI interpretation layer */}
                    <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-purple-400 mb-1">✨ Разбор от ИИ</h2>
                                <p className="text-sm text-gray-400">
                                    Соберу из этих цифр портрет: сильные стороны, узкие места и закономерности.
                                </p>
                                {madeAt && <p className="text-xs text-gray-500 mt-1">Составлено: {madeAt}</p>}
                            </div>
                            <button onClick={generate} disabled={loading}
                                className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40 whitespace-nowrap">
                                {loading ? 'Анализирую…' : card ? 'Обновить разбор' : 'Составить карточку'}
                            </button>
                        </div>
                        {error && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}
                        {loading && !card && <div className="mt-4 text-sm text-gray-500 animate-pulse">Свожу данные воедино…</div>}
                    </div>

                    {card && (
                        <div className="space-y-5 anim-fade-in">
                            {(card.headline || card.summary) && (
                                <div className="glass-card p-6 rounded-2xl border border-cyan-400/25">
                                    {card.headline && (
                                        <div className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                            {card.headline}
                                        </div>
                                    )}
                                    {card.summary && <p className="text-gray-300">{card.summary}</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Section title="Сильные стороны" items={card.strengths} icon="💪" tone="text-green-400" />
                                <Section title="Узкие места" items={card.challenges} icon="⚠️" tone="text-yellow-400" />
                            </div>

                            <Section title="Замеченные закономерности" items={card.patterns} icon="🔎" tone="text-cyan-400" />

                            {card.cognitiveProfile && (
                                <div className="glass-card p-5 rounded-2xl">
                                    <h3 className="font-bold text-purple-400 mb-2">🎓 Когнитивный профиль</h3>
                                    <p className="text-sm text-gray-300">{card.cognitiveProfile}</p>
                                </div>
                            )}

                            <Section title="Что можно сделать" items={card.recommendations} icon="🎯" tone="text-pink-400" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
