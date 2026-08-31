import { useState } from 'react';
import { Icon } from '../../components/Icons';
import { PageHeader } from '../../components/PageHeader';
import { SnowmanDay } from './SnowmanDay';
import { SnowmanCircles } from './SnowmanCircles';
import { findRecord, imbalanceBanner, todayStr } from './logic';
import { SPHERES } from './types';
import type { SnowmanProps } from '../../types/props';

const TABS = [
    { id: 'today', label: 'Сегодня' },
    { id: 'history', label: 'История' },
];

export function Snowman({ labels, setLabels, days, setDays }: SnowmanProps) {
    const [tab, setTab] = useState('today');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const today = todayStr();

    const todayRecord = findRecord(days, today);
    const banner = imbalanceBanner(todayRecord);
    const history = [...days].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="max-w-3xl mx-auto pb-24">
            <PageHeader page="snowman" title="Снеговик" subtitle="Баланс интеллекта, эмоций и тела за день" />

            <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${
                            tab === t.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'
                        }`}>{t.label}</button>
                ))}
            </div>

            {tab === 'today' ? (
                <>
                    {banner && (
                        <div className="glass-card rounded-xl px-4 py-2.5 mb-4 text-sm border border-cyan-400/30 text-cyan-400 flex items-center gap-2">
                            <span>{banner.icon}</span>
                            Сегодня твой день для {banner.sphereGenitive}!
                        </div>
                    )}
                    <SnowmanDay date={today} labels={labels} setLabels={setLabels} days={days} setDays={setDays} />
                </>
            ) : (
                <div className="space-y-3">
                    {history.length === 0 && (
                        <div className="glass-card p-8 rounded-2xl text-center text-[var(--text-muted)] text-sm">
                            Пока нет закрытых дней — добавь активности на вкладке «Сегодня».
                        </div>
                    )}
                    {history.map(d => (
                        <div key={d.date} className="glass-card p-4 rounded-2xl flex items-center gap-4">
                            <SnowmanCircles scores={d.scores} totalHarmony={d.totalHarmony} maxRadius={22} compact />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-[var(--text-main)]">
                                        {new Date(d.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                                    </span>
                                    {d.isEdited && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400">изменено</span>}
                                    <span className="text-xs text-[var(--text-muted)]">· гармония {d.totalHarmony}%</span>
                                </div>
                                <div className="flex gap-3 mt-1 text-xs">
                                    {SPHERES.map(s => (
                                        <span key={s.id} style={{ color: s.color }}>{s.icon} {d.scores[s.id]}/10</span>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setEditingDate(d.date)}
                                className="p-2 rounded-lg text-purple-400 hover:bg-purple-400/10 shrink-0">
                                <Icon name="edit" size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {editingDate && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-start justify-center z-50 p-4 overflow-y-auto"
                    onClick={() => setEditingDate(null)}>
                    <div className="max-w-lg w-full my-8" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-bold text-white">
                                {new Date(editingDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </h2>
                            <button onClick={() => setEditingDate(null)} className="text-gray-500 hover:text-white p-1.5 rounded-lg hover:bg-white/5">
                                <Icon name="close" size={18} />
                            </button>
                        </div>
                        <SnowmanDay date={editingDate} labels={labels} setLabels={setLabels} days={days} setDays={setDays} />
                    </div>
                </div>
            )}
        </div>
    );
}
