import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { SPHERES, sphereLabel, type ActivityLabel, type Sphere } from './types';
import { nowInstant } from '../../lib/datetime';
import { Modal } from '../../components/Modal';

type Props = {
    labels: ActivityLabel[];
    setLabels: (fn: (prev: ActivityLabel[]) => ActivityLabel[]) => void;
    onTapLabel: (label: ActivityLabel) => void;
};

/** Horizontal chip strip of the user's activity labels, plus the "+" modal that creates new ones. */
export function SnowmanLabels({ labels, setLabels, onTapLabel }: Props) {
    const { t } = useTranslation('track');
    const [modalOpen, setModalOpen] = useState(false);
    const [name, setName] = useState('');
    const [sphere, setSphere] = useState<Sphere>('intellect');

    const save = () => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const label: ActivityLabel = { id: `lbl_${Date.now()}`, label: trimmed, sphere, createdAt: nowInstant() };
        setLabels(prev => [...prev, label]);
        setName(''); setSphere('intellect'); setModalOpen(false);
    };

    const deleteLabel = (id: string) => setLabels(prev => prev.filter(l => l.id !== id));

    return (
        <div className="glass-card p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-muted)]">{t('track:snowman.labels.heading')}</span>
                <button onClick={() => setModalOpen(true)}
                    className="w-8 h-8 rounded-lg bg-cyan-400/10 text-cyan-400 flex items-center justify-center hover:bg-cyan-400/20 transition">
                    <Icon name="plus" size={16} />
                </button>
            </div>

            {labels.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-2">{t('track:snowman.labels.empty')}</p>
            ) : (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {labels.map(l => {
                        const s = SPHERES.find(sp => sp.id === l.sphere)!;
                        return (
                            <div key={l.id} className="shrink-0 group relative">
                                <button onClick={() => onTapLabel(l)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm whitespace-nowrap transition hover:brightness-110"
                                    style={{ borderColor: `${s.color}55`, backgroundColor: `${s.color}18`, color: s.color }}>
                                    <span>{s.icon}</span>{l.label}
                                </button>
                                <button onClick={() => deleteLabel(l.id)}
                                    title={t('track:snowman.labels.deleteTitle')}
                                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] text-[10px] leading-none items-center justify-center hidden group-hover:flex hover:text-red-400 hover:border-red-400/40">
                                    ×
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalOpen && (
                <Modal title={t('track:snowman.labels.newHeading')} onClose={() => setModalOpen(false)} size="sm">
                        <label htmlFor="label-name" className="t-caption mb-1 block">{t('track:snowman.labels.nameLabel')}</label>
                        <input id="label-name" type="text" value={name} onChange={e => setName(e.target.value)}
                            placeholder={t('track:snowman.labels.namePlaceholder')}
                            className="w-full mb-4 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 outline-none focus:border-cyan-400 text-white" />

                        <fieldset className="mb-5">
                            <legend className="t-caption mb-1">{t('track:snowman.labels.sphereLegend')}</legend>
                            <div className="grid grid-cols-3 gap-2">
                                {SPHERES.map(s => (
                                    <button key={s.id} type="button" onClick={() => setSphere(s.id)}
                                        aria-pressed={sphere === s.id}
                                        className={`py-2 rounded-lg border text-sm transition ${
                                            sphere === s.id ? 'text-white' : 'text-[var(--gq-text-tertiary)] border-[var(--border)] hover:border-[var(--gq-border-strong)]'
                                        }`}
                                        style={sphere === s.id ? { backgroundColor: `${s.color}33`, borderColor: s.color } : undefined}>
                                        <div aria-hidden="true">{s.icon}</div>
                                        <div className="text-[11px] mt-0.5">{sphereLabel(s.id, t)}</div>
                                    </button>
                                ))}
                            </div>
                        </fieldset>

                        <div className="flex gap-3">
                            <button onClick={() => setModalOpen(false)}
                                className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5">{t('track:snowman.labels.cancel')}</button>
                            <button type="button" onClick={save} disabled={!name.trim()}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold disabled:opacity-40">{t('track:snowman.labels.save')}</button>
                        </div>
                </Modal>
            )}
        </div>
    );
}
