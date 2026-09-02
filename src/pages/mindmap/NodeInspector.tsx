import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../../components/Icons';
import type { EffortType, MindNode, NodeStatus, Priority } from '../../types/mindmap';
import { effortLabel, priorityLabel } from '../../lib/mindTree';
import { nowInstant } from '../../lib/datetime';

type Props = {
    node: MindNode;
    hasChildren: boolean;
    effectiveProgress: number;
    subtreeHours: number;
    onPatch: (id: string, patch: Partial<MindNode>) => void;
    onClose: () => void;
};

const PRIORITIES: Priority[] = ['urgent_important', 'not_urgent_important', 'urgent_not_important', 'not_urgent_not_important'];
const EFFORTS: EffortType[] = ['deep_work', 'routine', 'social', 'learning'];
const STATUS_KEY: Record<NodeStatus, string> = {
    backlog: 'plan:mindmap.status.backlog',
    in_progress: 'plan:mindmap.status.in_progress',
    review: 'plan:mindmap.status.review',
    done: 'plan:mindmap.status.done',
    archived: 'plan:mindmap.status.archived',
};
const STATUSES: NodeStatus[] = ['backlog', 'in_progress', 'review', 'done', 'archived'];

const fieldLabel = 'text-xs font-medium text-[var(--text-muted)] mb-1 block';
const fieldInput = 'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none focus:border-cyan-400';

export function NodeInspector({ node, hasChildren, effectiveProgress, subtreeHours, onPatch, onClose }: Props) {
    const { t } = useTranslation('plan');
    // The inspector renders per selected node, so field ids must be unique per
    // instance or a second inspector would steal the first one's labels.
    const uid = useId();
    const patch = (p: Partial<MindNode>) => onPatch(node.id, { ...p, updatedAt: nowInstant() });

    return (
        <div className="glass-card rounded-2xl p-4 w-full sm:w-80 shrink-0 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--text-main)] break-words">{node.text}</h3>
                <button onClick={onClose} className="shrink-0 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                    <Icon name="close" size={16} />
                </button>
            </div>

            <div>
                <label className={fieldLabel}>
                    {hasChildren ? t('plan:mindmap.inspector.progressLabelAuto') : t('plan:mindmap.inspector.progressLabelManual', { value: node.progress })}
                </label>
                <input
                    type="range" min={0} max={100}
                    value={hasChildren ? effectiveProgress : node.progress}
                    disabled={hasChildren}
                    onChange={e => patch({ progress: Number(e.target.value) })}
                    className="w-full accent-cyan-400 disabled:opacity-50"
                />
                {hasChildren && <p className="text-[11px] text-[var(--text-muted)] mt-1">{t('plan:mindmap.inspector.computedNote', { value: effectiveProgress })}</p>}
            </div>

            <div>
                <label htmlFor={`${uid}-priority`} className={fieldLabel}>{t('plan:mindmap.inspector.priorityLabel')}</label>
                <select id={`${uid}-priority`} className={fieldInput} value={node.priority} onChange={e => patch({ priority: e.target.value as Priority })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{priorityLabel(p, t)}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor={`${uid}-due`} className={fieldLabel}>{t('plan:mindmap.inspector.dueLabel')}</label>
                <input id={`${uid}-due`} type="date" className={fieldInput} value={node.dueDate ?? ''}
                    onChange={e => patch({ dueDate: e.target.value || null })} />
            </div>

            <div>
                <label htmlFor={`${uid}-hours`} className={fieldLabel}>{t('plan:mindmap.inspector.hoursLabel')}{hasChildren && subtreeHours > 0 ? t('plan:mindmap.inspector.hoursSubtreeSuffix', { hours: subtreeHours }) : ''}</label>
                <input id={`${uid}-hours`} type="number" min={0} step={0.5} className={fieldInput}
                    value={node.estimatedHours ?? ''}
                    onChange={e => patch({ estimatedHours: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>

            <div>
                <label htmlFor={`${uid}-effort`} className={fieldLabel}>{t('plan:mindmap.inspector.effortLabel')}</label>
                <select id={`${uid}-effort`} className={fieldInput} value={node.effortType} onChange={e => patch({ effortType: e.target.value as EffortType })}>
                    {EFFORTS.map(f => <option key={f} value={f}>{effortLabel(f, t)}</option>)}
                </select>
            </div>

            <fieldset>
                <legend className={fieldLabel}>{t('plan:mindmap.inspector.energyLabel')}</legend>
                <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" onClick={() => patch({ energyScore: n as 1 | 2 | 3 | 4 | 5 })}
                            aria-pressed={node.energyScore >= n}
                            aria-label={t('plan:mindmap.inspector.energyAriaLabel', { n })}
                            className={`flex-1 h-7 rounded-lg text-xs border transition ${node.energyScore >= n ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'border-[var(--border)] text-[var(--gq-text-tertiary)]'}`}>
                            {n}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div>
                <label htmlFor={`${uid}-status`} className={fieldLabel}>{t('plan:mindmap.inspector.statusLabel')}</label>
                <select id={`${uid}-status`} className={fieldInput} value={node.status} onChange={e => patch({ status: e.target.value as NodeStatus })}>
                    {STATUSES.map(s => <option key={s} value={s}>{t(STATUS_KEY[s])}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor={`${uid}-tags`} className={fieldLabel}>{t('plan:mindmap.inspector.tagsLabel')}</label>
                <input id={`${uid}-tags`} type="text" className={fieldInput}
                    defaultValue={node.tags.join(', ')}
                    onBlur={e => patch({ tags: e.target.value.split(',').map(v => v.trim()).filter(Boolean) })} />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--text-main)] cursor-pointer">
                <input type="checkbox" checked={node.isMilestone} onChange={e => patch({ isMilestone: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4" />
                {t('plan:mindmap.inspector.milestoneCheckboxLabel')}
            </label>

            {node.timeSpentTotal > 0 && (
                <p className="text-[11px] text-[var(--text-muted)]">{t('plan:mindmap.inspector.timeSpentLabel', { minutes: node.timeSpentTotal })}</p>
            )}
        </div>
    );
}
