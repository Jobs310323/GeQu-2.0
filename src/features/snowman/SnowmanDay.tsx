import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import { SnowmanCircles } from './SnowmanCircles';
import { SnowmanLabels } from './SnowmanLabels';
import { ConfettiBurst } from './Confetti';
import { playAddSound } from './sound';
import { addActivity, computePoints, findRecord, isClosedDay, removeActivity, updateActivity } from './logic';
import { DIFFICULTY_OPTIONS, SPHERES, difficultyLabel, sphereLabel, type Activity, type ActivityLabel, type DayRecord, type Difficulty, type Sphere } from './types';
import { nowInstant } from '../../lib/datetime';
import { Modal } from '../../components/Modal';

type Props = {
    date: string;
    labels: ActivityLabel[];
    setLabels: (fn: (prev: ActivityLabel[]) => ActivityLabel[]) => void;
    days: DayRecord[];
    setDays: (fn: (prev: DayRecord[]) => DayRecord[]) => void;
};

/** Add/edit popup shared by "tap a chip" (new activity) and "edit an entry"
 *  (pre-filled, from the per-sphere list) — both just differ in initial values. */
function ActivityPopup({ label, sphere, initial, onSave, onClose }: {
    label: string; sphere: Sphere; initial?: { minutes: number; difficulty: Difficulty };
    onSave: (minutes: number, difficulty: Difficulty) => void; onClose: () => void;
}) {
    const { t } = useTranslation('track');
    const [minutes, setMinutes] = useState(initial?.minutes ?? 15);
    const [difficulty, setDifficulty] = useState<Difficulty>(initial?.difficulty ?? 1);
    const s = SPHERES.find(sp => sp.id === sphere)!;

    return (
        <Modal title={label} subtitle={sphereLabel(s.id, t)} onClose={onClose} size="sm">
                <label htmlFor="activity-minutes" className="t-caption mb-1 block">{t('track:snowman.day.minutesLabel')}</label>
                <input id="activity-minutes" type="number" min={5} step={5} value={minutes}
                    onChange={e => setMinutes(Math.max(5, Number(e.target.value) || 5))}
                    className="w-full mb-4 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 outline-none focus:border-cyan-400 text-white" />

                <fieldset className="mb-5">
                    <legend className="t-caption mb-1">{t('track:snowman.day.difficultyLegend')}</legend>
                    <div className="grid grid-cols-3 gap-2">
                        {DIFFICULTY_OPTIONS.map(d => (
                            <button key={d.id} type="button" onClick={() => setDifficulty(d.id)}
                                aria-pressed={difficulty === d.id}
                                className={`py-2 rounded-lg border text-xs transition ${
                                    difficulty === d.id ? 'bg-cyan-400/15 border-cyan-400 text-cyan-400' : 'text-[var(--gq-text-tertiary)] border-[var(--border)] hover:border-[var(--gq-border-strong)]'
                                }`}>{difficultyLabel(d.id, t)}</button>
                        ))}
                    </div>
                </fieldset>

                <p className="t-caption mb-4">
                    {t('track:snowman.day.pointsPrefix')} <span className="font-bold text-[var(--gq-text-primary)] t-metric">{computePoints(minutes, difficulty)}</span>
                </p>

                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-[var(--gq-text-tertiary)] hover:bg-white/5">{t('track:snowman.day.cancel')}</button>
                    <button type="button" onClick={() => onSave(minutes, difficulty)}
                        className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold">
                        {initial ? t('track:snowman.day.save') : t('track:snowman.day.add')}
                    </button>
                </div>
        </Modal>
    );
}

export function SnowmanDay({ date, labels, setLabels, days, setDays }: Props) {
    const { t } = useTranslation('track');
    const [selectedSphere, setSelectedSphere] = useState<Sphere | null>(null);
    const [pendingLabel, setPendingLabel] = useState<ActivityLabel | null>(null);
    const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
    const [toast, setToast] = useState('');
    const [confettiTrigger, setConfettiTrigger] = useState(0);

    const record = findRecord(days, date);
    const scores = record?.scores ?? { intellect: 0, emotion: 0, body: 0 };
    const totalHarmony = record?.totalHarmony ?? 0;
    const closed = record ? isClosedDay(record) : false;

    const fireSuccess = (points: number, sphere: Sphere) => {
        setToast(t('track:snowman.day.toast', { points, sphere: sphereLabel(sphere, t) }));
        setTimeout(() => setToast(''), 2500);
        playAddSound();
        if (points > 5) setConfettiTrigger(c => c + 1);
    };

    const confirmAdd = (minutes: number, difficulty: Difficulty) => {
        if (!pendingLabel) return;
        const points = computePoints(minutes, difficulty);
        const activity: Activity = {
            id: `act_${Date.now()}`, labelId: pendingLabel.id, label: pendingLabel.label, sphere: pendingLabel.sphere,
            minutes, difficulty, points, createdAt: nowInstant(), updatedAt: nowInstant(),
        };
        setDays(prev => addActivity(prev, date, activity));
        fireSuccess(points, pendingLabel.sphere);
        setPendingLabel(null);
    };

    const confirmEdit = (minutes: number, difficulty: Difficulty) => {
        if (!editingActivity) return;
        const points = computePoints(minutes, difficulty);
        setDays(prev => updateActivity(prev, date, editingActivity.id, { minutes, difficulty, points }));
        fireSuccess(points, editingActivity.sphere);
        setEditingActivity(null);
    };

    const deleteActivity = (id: string) => setDays(prev => removeActivity(prev, date, id));

    const sphereActivities = selectedSphere ? (record?.activities ?? []).filter(a => a.sphere === selectedSphere) : [];

    return (
        <div>
            {closed && (
                <div className="glass-card rounded-xl px-4 py-2.5 mb-4 text-sm text-yellow-400 border border-yellow-400/30 flex items-center gap-2">
                    <Icon name="alertTriangle" size={15} />
                    {t('track:snowman.day.closedNotice')}
                </div>
            )}

            <div className="glass-card p-6 rounded-2xl mb-4 flex flex-col items-center">
                <SnowmanCircles scores={scores} totalHarmony={totalHarmony} onSphereClick={s => setSelectedSphere(s === selectedSphere ? null : s)} />
            </div>

            {selectedSphere && (
                <div className="glass-card p-4 rounded-2xl mb-4 anim-fade-in">
                    <div className="text-sm font-medium mb-3" style={{ color: SPHERES.find(s => s.id === selectedSphere)!.color }}>
                        {SPHERES.find(s => s.id === selectedSphere)!.icon} {sphereLabel(selectedSphere, t)} {t('track:snowman.day.activitiesForSphere')}
                    </div>
                    {sphereActivities.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">{t('track:snowman.day.noActivities')}</p>
                    ) : (
                        <div className="space-y-2">
                            {sphereActivities.map(a => (
                                <div key={a.id} className="flex items-center justify-between gap-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2">
                                    <div className="min-w-0">
                                        <div className="text-sm text-[var(--text-main)] truncate">{a.label}</div>
                                        <div className="text-[11px] text-[var(--text-muted)]">{t('track:snowman.day.activityMeta', { minutes: a.minutes, difficulty: difficultyLabel(DIFFICULTY_OPTIONS.find(d => d.id === a.difficulty)!.id, t), points: a.points })}</div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setEditingActivity(a)} className="p-1.5 rounded-lg text-purple-400 hover:bg-purple-400/10"><Icon name="edit" size={14} /></button>
                                        <button onClick={() => deleteActivity(a.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"><Icon name="trash" size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <SnowmanLabels labels={labels} setLabels={setLabels} onTapLabel={setPendingLabel} />

            {pendingLabel && (
                <ActivityPopup label={pendingLabel.label} sphere={pendingLabel.sphere} onSave={confirmAdd} onClose={() => setPendingLabel(null)} />
            )}
            {editingActivity && (
                <ActivityPopup label={editingActivity.label} sphere={editingActivity.sphere}
                    initial={{ minutes: editingActivity.minutes, difficulty: editingActivity.difficulty }}
                    onSave={confirmEdit} onClose={() => setEditingActivity(null)} />
            )}

            <ConfettiBurst trigger={confettiTrigger} />

            {toast && (
                <div className="fixed bottom-8 right-8 bg-[var(--bg-card)] border border-cyan-400 px-6 py-3 rounded-xl text-white shadow-xl anim-fade-in z-[110]">
                    {toast}
                </div>
            )}
        </div>
    );
}
