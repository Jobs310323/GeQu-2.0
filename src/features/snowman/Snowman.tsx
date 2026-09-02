import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { PageHeader } from '../../components/PageHeader';
import { SnowmanDay } from './SnowmanDay';
import { SnowmanCircles } from './SnowmanCircles';
import { findRecord, imbalanceBanner, todayStr } from './logic';
import { SPHERES, sphereBanner } from './types';
import type { SnowmanProps } from '../../types/props';
import { Modal } from '../../components/Modal';
import { formatDate } from '../../lib/format';

export function Snowman({ labels, setLabels, days, setDays }: SnowmanProps) {
    const { t } = useTranslation('track');
    const TABS = [
        { id: 'today', label: t('track:snowman.tab.today') },
        { id: 'history', label: t('track:snowman.tab.history') },
    ];
    const [tab, setTab] = useState('today');
    const [editingDate, setEditingDate] = useState<string | null>(null);
    const today = todayStr();

    const todayRecord = findRecord(days, today);
    const banner = imbalanceBanner(todayRecord);
    const history = [...days].sort((a, b) => b.date.localeCompare(a.date));

    return (
        <div className="max-w-3xl mx-auto pb-24">
            <PageHeader page="snowman" title={t('track:snowman.title')} subtitle={t('track:snowman.subtitle')} />

            <div className="glass-card rounded-2xl p-1.5 mb-6 flex gap-1">
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        className={`px-3.5 py-1.5 rounded-xl text-sm transition ${
                            tab === tb.id ? 'bg-cyan-400/10 text-cyan-400' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'
                        }`}>{tb.label}</button>
                ))}
            </div>

            {tab === 'today' ? (
                <>
                    {banner && (
                        <div className="glass-card rounded-xl px-4 py-2.5 mb-4 text-sm border border-cyan-400/30 text-cyan-400 flex items-center gap-2">
                            <span>{banner.icon}</span>
                            {sphereBanner(banner.sphere, t)}
                        </div>
                    )}
                    <SnowmanDay date={today} labels={labels} setLabels={setLabels} days={days} setDays={setDays} />
                </>
            ) : (
                <div className="space-y-3">
                    {history.length === 0 && (
                        <div className="glass-card p-8 rounded-2xl text-center text-[var(--text-muted)] text-sm">
                            {t('track:snowman.history.empty')}
                        </div>
                    )}
                    {history.map(d => (
                        <div key={d.date} className="glass-card p-4 rounded-2xl flex items-center gap-4">
                            <SnowmanCircles scores={d.scores} totalHarmony={d.totalHarmony} maxRadius={22} compact />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-[var(--text-main)]">
                                        {formatDate(d.date, 'long')}
                                    </span>
                                    {d.isEdited && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400">{t('track:snowman.history.edited')}</span>}
                                    <span className="text-xs text-[var(--text-muted)]">{t('track:snowman.history.harmony', { value: d.totalHarmony })}</span>
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
                <Modal
                    title={formatDate(editingDate, 'long')}
                    onClose={() => setEditingDate(null)}
                    size="md"
                >
                    <SnowmanDay date={editingDate} labels={labels} setLabels={setLabels} days={days} setDays={setDays} />
                </Modal>
            )}
        </div>
    );
}
