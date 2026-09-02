import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import { callAIJson, streamAI } from '../lib/ai';
import { DB } from '../lib/db';
import { buildProfile, hasEnoughData, testLabel } from '../lib/profile';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import type { UserCardProps } from '../types/props';
import type { TestSummary } from '../lib/profile';
import { errorMessage } from '../lib/helpers';
import { formatDate, formatDateTime, formatNumber } from '../lib/format';
import type { ReactNode } from 'react';

/** The two AI outputs cached on this device, with the stamp shown beside them. */
type CachedCard = { card: AiCard; madeAt?: string };
type CachedReport = { text: string; madeAt?: string };

type AiCard = {
    headline?: string;
    summary?: string;
    strengths?: string[];
    challenges?: string[];
    patterns?: string[];
    cognitiveProfile?: string;
    recommendations?: string[];
};



function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string | undefined }) {
    return (
        <div className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
            <div className="text-xs text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold text-white tabular-nums">{value}</div>
            {hint && <div className="text-[11px] text-gray-500 mt-0.5">{hint}</div>}
        </div>
    );
}

function Section({ title, items, icon, tone }: { title: string; items?: string[] | undefined; icon: string; tone: string }) {
    if (!items?.length) return null;
    return (
        <div className="glass-card p-5 rounded-2xl">
            <h3 className={`font-bold mb-3 flex items-center gap-2 ${tone}`}>
                <Icon name={icon} size={16} />
                {title}
            </h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-300 flex gap-2">
                        <span className={tone}>•</span><span>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function UserCard({ logs, setLogs, diary, habits, kanban, goals, gymData, testResults,
                           clinicalResults, cbtRecords, finance, circles }: UserCardProps) {
    const { t } = useTranslation(['profile', 'common']);
    const [card, setCard] = useState<AiCard | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [madeAt, setMadeAt] = useState('');
    const [report, setReport] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [reportError, setReportError] = useState('');
    const [reportAt, setReportAt] = useState('');

    const rawProfile = buildProfile({ logs, diary, habits, kanban, goals, gymData, testResults,
        clinicalResults, cbtRecords, finance, circles });
    // `buildProfile` is pure and emits translation keys for the achievement
    // names and bare type ids for cognitive tests. Resolve both here, so the
    // AI reads "Marathoner" / "Schulte table (s)" rather than
    // `insights:xp.achievement.marathon.title` / `schulte`.
    const profile = {
        ...rawProfile,
        gamification: {
            ...rawProfile.gamification,
            achievementsUnlocked: rawProfile.gamification.achievementsUnlocked.map(key => t(key)),
        },
        cognitive: rawProfile.cognitive.map(test => ({ ...test, label: testLabel(test.type, t) })),
    };
    const enough = hasEnoughData(profile);

    const deleteLog = (id: number) => setLogs((logs ?? []).filter((l) => l.id !== id));
    const sortedLogs = [...(logs ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    useEffect(() => {
        const cached = DB.get<CachedCard | null>('usercard', null);
        if (cached?.card) { setCard(cached.card); setMadeAt(cached.madeAt || ''); }
        const cachedReport = DB.get<CachedReport | null>('usercard_report', null);
        if (cachedReport?.text) { setReport(cachedReport.text); setReportAt(cachedReport.madeAt || ''); }
    }, []);

    const stampNow = () => formatDateTime(Date.now(), 'medium');

    const generateReport = async () => {
        setReportLoading(true); setReportError(''); setReport('');
        let text = '';
        try {
            await streamAI({
                system: t('profile:card.reportSystem'),
                maxTokens: 3500,
                messages: [{
                    role: 'user',
                    content: t('profile:card.reportPrompt', { json: JSON.stringify(profile) }),
                }],
                onToken: chunk => { text += chunk; setReport(text); },
                t,
            });
            const stamp = stampNow();
            setReportAt(stamp);
            DB.save('usercard_report', { text, madeAt: stamp });
        } catch (e) {
            setReportError(errorMessage(e, t('profile:card.reportFailed')));
        } finally {
            setReportLoading(false);
        }
    };

    const generate = async () => {
        setLoading(true); setError('');
        try {
            const result = await callAIJson<AiCard>({
                system: t('profile:card.cardSystem'),
                prompt: t('profile:card.cardPrompt', { json: JSON.stringify(profile) }),
                maxTokens: 2000,
                t,
            });
            const stamp = stampNow();
            setCard(result); setMadeAt(stamp);
            DB.save('usercard', { card: result, madeAt: stamp });
        } catch (e) {
            setError(errorMessage(e, t('profile:card.cardFailed')));
        } finally {
            setLoading(false);
        }
    };

    const s = profile.state;
    const trendText = (test: TestSummary) =>
        test.improvedPct === null ? t('profile:card.littleData')
            : test.improvedPct > 0 ? t('profile:card.better', { pct: test.improvedPct })
            : test.improvedPct < 0 ? t('profile:card.worse', { pct: Math.abs(test.improvedPct) })
            : t('profile:card.unchanged');

    return (
        <div className="max-w-5xl">
            <PageHeader page="card" title={t('profile:card.title')}
                subtitle={t('profile:card.subtitle')} />

            {!enough ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    {t('profile:card.empty')}
                </div>
            ) : (
                <>
                    {/* Factual layer — always available, no AI or network needed */}
                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Icon name="idcard" size={18} className="text-cyan-400" />
                                {t('profile:card.facts')}
                            </h2>
                            <span className="text-xs text-gray-500">
                                {profile.period.firstEntry
                                    ? t('profile:card.period', {
                                        from: formatDate(profile.period.firstEntry),
                                        to: formatDate(profile.period.lastEntry ?? profile.period.firstEntry),
                                        count: profile.period.daysTracked,
                                    })
                                    : t('profile:card.noClosedDays')}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                            <Stat label={t('profile:card.level')} value={profile.gamification.level} hint={t('profile:card.xp', { count: profile.gamification.xp })} />
                            <Stat label={t('profile:card.streak')} value={t('profile:card.streakDays', { count: s.currentStreak })} hint={t('profile:card.streakHint')} />
                            <Stat label={t('profile:card.achievements')} value={`${profile.gamification.achievementsUnlocked.length}/${profile.gamification.achievementsTotal}`} />
                            <Stat label={t('profile:card.journal')} value={profile.journal.entries} hint={t('profile:card.gratitudeHint', { count: profile.journal.gratitudeEntries })} />
                        </div>

                        <div className="grid grid-cols-3 gap-3 mb-4">
                            <Stat label={t('profile:card.sleep30')} value={s.last30Days.sleep || '—'} hint={t('profile:card.allTimeHint', { value: s.allTime.sleep || '—' })} />
                            <Stat label={t('profile:card.focus30')} value={s.last30Days.focus || '—'} hint={t('profile:card.allTimeHint', { value: s.allTime.focus || '—' })} />
                            <Stat label={t('profile:card.mood30')} value={s.last30Days.mood || '—'} hint={t('profile:card.allTimeHint', { value: s.allTime.mood || '—' })} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <Stat label={t('profile:card.tasksDone')} value={profile.tasks.done} hint={t('profile:card.tasksQueued', { count: profile.tasks.todo })} />
                            <Stat label={t('profile:card.workouts')} value={profile.gym.workouts} hint={t('profile:card.tonnage', { value: formatNumber(profile.gym.totalTonnageKg) })} />
                            <Stat label={t('profile:card.testsTaken')} value={profile.cognitive.reduce((a, test) => a + test.count, 0)} hint={t('profile:card.testKinds', { count: profile.cognitive.length })} />
                            <Stat label={t('profile:card.habits')} value={profile.habits.length} hint={t('profile:card.habitTicks', { count: profile.habits.reduce((a, h) => a + h.done, 0) })} />
                        </div>

                        {(profile.helpedTop.length > 0 || profile.hinderedTop.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 pt-5 border-t border-[var(--border)]">
                                {profile.helpedTop.length > 0 && (
                                    <div>
                                        <div className="text-sm text-gray-400 mb-2">{t('profile:card.helpedMost')}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.helpedTop.map(tag => (
                                                <span key={tag.tag} className="text-xs px-2 py-1 rounded-full bg-green-400/10 text-green-400 border border-green-400/30">
                                                    {tag.tag} · {tag.n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {profile.hinderedTop.length > 0 && (
                                    <div>
                                        <div className="text-sm text-gray-400 mb-2">{t('profile:card.hinderedMost')}</div>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.hinderedTop.map(tag => (
                                                <span key={tag.tag} className="text-xs px-2 py-1 rounded-full bg-red-400/10 text-red-400 border border-red-400/30">
                                                    {tag.tag} · {tag.n}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {profile.cognitive.length > 0 && (
                            <div className="mt-5 pt-5 border-t border-[var(--border)]">
                                <div className="text-sm text-gray-400 mb-2">{t('profile:card.cognitiveTrend')}</div>
                                <div className="space-y-2">
                                    {profile.cognitive.map(test => (
                                        <div key={test.type} className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--bg-input)] px-3 py-2 rounded-lg border border-[var(--border)]">
                                            <span className="text-sm text-gray-300 flex-1 min-w-[160px]">{test.label}</span>
                                            <span className="text-xs text-gray-500">{t('profile:card.timesTaken', { count: test.count })}</span>
                                            <span className="text-xs text-gray-400 tabular-nums">{t('profile:card.best', { value: test.best })}</span>
                                            <span className={`text-xs font-bold ${
                                                test.improvedPct === null ? 'text-gray-500'
                                                    : test.improvedPct > 0 ? 'text-green-400'
                                                    : test.improvedPct < 0 ? 'text-red-400' : 'text-gray-400'
                                            }`}>{trendText(test)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Raw history of closed days — moved here from the daily-close screen so
                        closing a day doesn't also mean scrolling through every past one. */}
                    {sortedLogs.length > 0 && (
                        <div className="glass-card p-6 rounded-2xl mb-6">
                            <div className="flex items-baseline justify-between mb-4">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Icon name="calendar" size={18} className="text-cyan-400" />
                                    {t('profile:card.history')}
                                </h2>
                                <span className="text-xs text-gray-500">{sortedLogs.length}</span>
                            </div>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {sortedLogs.map((l) => (
                                    <div key={l.id ?? l.date} className="border-b border-[var(--border)] pb-4 anim-fade-in">
                                        <div className="flex items-baseline justify-between gap-3 mb-2">
                                            <span className="text-xs text-cyan-400">
                                                {formatDate(l.date, 'long')}
                                            </span>
                                            <button onClick={() => deleteLog(l.id)} className="text-red-400 text-xs hover:underline shrink-0">{t('profile:card.delete')}</button>
                                        </div>
                                        <div className="text-sm text-gray-300 mb-1">{t('profile:card.logLine', { sleep: l.sleep, focus: l.focus, mood: l.mood })}</div>
                                        {l.mainEvent && <div className="text-sm text-gray-400 mb-1">{t('profile:card.mainEvent', { value: l.mainEvent })}</div>}
                                        {l.testTomorrow && <div className="text-sm text-gray-400 mb-1">{t('profile:card.testTomorrow', { value: l.testTomorrow })}</div>}
                                        {l.customQuestion && (
                                            <div className="text-sm mb-1"><span className="text-purple-400">{l.customQuestion}</span>
                                                {l.customAnswer && <span className="text-gray-300"> — {l.customAnswer}</span>}</div>
                                        )}
                                        {l.gratitude?.length > 0 && (
                                            <div className="text-xs text-pink-400 mb-1">{t('profile:card.gratitude', { value: l.gratitude.join(', ') })}</div>
                                        )}
                                        {l.helped?.length > 0 && <div className="text-xs text-green-400">{t('profile:card.helped', { value: l.helped.join(', ') })}</div>}
                                        {l.hindered?.length > 0 && <div className="text-xs text-red-400">{t('profile:card.hindered', { value: l.hindered.join(', ') })}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* AI interpretation layer */}
                    <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-purple-400 mb-1 flex items-center gap-2">
                                    <Icon name="sparkle" size={16} />
                                    {t('profile:card.aiHeading')}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    {t('profile:card.aiBlurb')}
                                </p>
                                {madeAt && <p className="text-xs text-gray-500 mt-1">{t('profile:card.madeAt', { when: madeAt })}</p>}
                            </div>
                            <button onClick={generate} disabled={loading}
                                className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40 whitespace-nowrap">
                                {loading ? t('profile:card.analysing') : card ? t('profile:card.refresh') : t('profile:card.build')}
                            </button>
                        </div>
                        {error && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}
                        {loading && !card && <div className="mt-4 text-sm text-gray-500 animate-pulse">{t('profile:card.gathering')}</div>}
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
                                <Section title={t('profile:card.strengths')} items={card.strengths} icon="flame" tone="text-green-400" />
                                <Section title={t('profile:card.challenges')} items={card.challenges} icon="alertTriangle" tone="text-yellow-400" />
                            </div>

                            <Section title={t('profile:card.patterns')} items={card.patterns} icon="search" tone="text-cyan-400" />

                            {card.cognitiveProfile && (
                                <div className="glass-card p-5 rounded-2xl">
                                    <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-2">
                                        <Icon name="library" size={16} />
                                        {t('profile:card.cognitiveProfile')}
                                    </h3>
                                    <p className="text-sm text-gray-300">{card.cognitiveProfile}</p>
                                </div>
                            )}

                            <Section title={t('profile:card.recommendations')} items={card.recommendations} icon="target" tone="text-pink-400" />
                        </div>
                    )}

                    {/* Long-form report over every data source, not just the summary card */}
                    <div className="glass-card p-6 rounded-2xl mt-6 border border-cyan-400/30 bg-cyan-400/5">
                        <div className="flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg font-bold text-cyan-400 mb-1 flex items-center gap-2">
                                    <Icon name="library" size={16} />
                                    {t('profile:card.reportHeading')}
                                </h2>
                                <p className="text-sm text-gray-400">
                                    {t('profile:card.reportBlurb')}
                                </p>
                                {reportAt && <p className="text-xs text-gray-500 mt-1">{t('profile:card.madeAt', { when: reportAt })}</p>}
                            </div>
                            <button onClick={generateReport} disabled={reportLoading}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40 whitespace-nowrap">
                                {reportLoading ? t('profile:card.analysing') : report ? t('profile:card.reportRefresh') : t('profile:card.reportBuild')}
                            </button>
                        </div>
                        {reportError && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{reportError}</div>}
                        {reportLoading && !report && <div className="mt-4 text-sm text-gray-500 animate-pulse">{t('profile:card.reportReading')}</div>}
                    </div>

                    {report && (
                        <div className="glass-card p-6 rounded-2xl mt-5 anim-fade-in">
                            <div className="text-gray-200 markdown-content"
                                dangerouslySetInnerHTML={{ __html: marked.parse(report) as string }} />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
