import { useState } from 'react';
import { WeekSummary } from '../components/WeekSummary';
import { computeXp, levelFromXp, chapterFor, evaluateAchievements, xpToReach } from '../lib/xp';
import { PageHeader } from '../components/PageHeader';
import { Icon } from '../components/Icons';
import { Dynamics } from './Dynamics';

const TABS = [
    { id: 'progress', label: 'Прогресс' },
    { id: 'dynamics', label: 'Динамика' },
];

export function Progress({ logs, habits, kanban, gymData, testResults, diary }: any) {
    const [tab, setTab] = useState('progress');
    const data = { logs, habits, kanban, gymData, testResults };
    const { total, breakdown } = computeXp(data);
    const info = levelFromXp(total);
    const chapter = chapterFor(info.level);
    const achievements = evaluateAchievements(data);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return (
        <div className="max-w-5xl">
            <PageHeader page="progress" title="Прогресс" />

            <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1 flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${
                            tab === t.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'dynamics' ? (
                <Dynamics logs={logs} testResults={testResults} gymData={gymData} />
            ) : (
                <>
                    <div className="mb-6">
                        <WeekSummary logs={logs} habits={habits} kanban={kanban} gymData={gymData}
                            testResults={testResults} diary={diary} />
                    </div>

                    {/* Level + XP */}
                    <div className="glass-card p-6 rounded-2xl mb-6 border border-cyan-400/25 bg-cyan-400/5">
                        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
                            <div>
                                <div className="text-xs uppercase tracking-wider text-gray-500 mb-1">Уровень</div>
                                <div className="text-5xl font-extrabold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                    {info.level}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-white tabular-nums">{total.toLocaleString('ru-RU')} XP</div>
                                <div className="text-xs text-gray-400">
                                    до {info.level + 1} уровня: {(xpToReach(info.level + 1) - total).toLocaleString('ru-RU')} XP
                                </div>
                            </div>
                        </div>

                        <div className="w-full h-3 rounded-full bg-black/30 overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 transition-all duration-700"
                                style={{ width: `${info.progress * 100}%` }} />
                        </div>
                        <div className="text-xs text-gray-500 tabular-nums">{info.intoLevel} / {info.levelSpan} XP в этом уровне</div>

                        <div className="mt-5 pt-4 border-t border-[var(--border)]">
                            <div className="text-cyan-400 font-bold mb-1">{chapter.title}</div>
                            <p className="text-sm text-gray-400">{chapter.text}</p>
                        </div>
                    </div>

                    {/* Where XP came from */}
                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <h2 className="text-xl font-bold mb-4">Откуда опыт</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {breakdown.map(b => (
                                <div key={b.key} className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span>{b.icon}</span>
                                        <span className="text-sm text-gray-300">{b.label}</span>
                                    </div>
                                    <div className="flex items-baseline justify-between">
                                        <span className="text-xs text-gray-500">{b.count} шт.</span>
                                        <span className="text-cyan-400 font-bold tabular-nums">+{b.xp}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Achievements */}
                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Icon name="trophy" size={18} className="text-cyan-400" />
                                Достижения
                            </h2>
                            <span className="text-sm text-gray-400">{unlockedCount} из {achievements.length}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {achievements.map(a => (
                                <div key={a.id}
                                    className={`p-4 rounded-xl border transition ${
                                        a.unlocked
                                            ? 'bg-green-400/10 border-green-400/40'
                                            : 'bg-[var(--bg-input)] border-[var(--border)]'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        <span className={`text-2xl ${a.unlocked ? '' : 'opacity-30 grayscale'}`}>{a.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-bold ${a.unlocked ? 'text-green-400' : 'text-gray-300'}`}>{a.title}</div>
                                            <div className="text-xs text-gray-500 mb-2">{a.desc}</div>
                                            {a.unlocked ? (
                                                <div className="text-[11px] text-green-400">Получено ✓</div>
                                            ) : (
                                                <>
                                                    <div className="w-full h-1.5 rounded-full bg-black/30 overflow-hidden">
                                                        <div className="h-full bg-cyan-400/70" style={{ width: `${a.ratio * 100}%` }} />
                                                    </div>
                                                    <div className="text-[11px] text-gray-500 mt-1 tabular-nums">{a.current} / {a.goal}</div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
