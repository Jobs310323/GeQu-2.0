import { useId } from 'react';
import { Icon } from '../../components/Icons';
import type { EffortType, MindNode, NodeStatus, Priority } from '../../types/mindmap';
import { EFFORT_LABEL, PRIORITY_LABEL } from '../../lib/mindTree';
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
const STATUSES: { value: NodeStatus; label: string }[] = [
    { value: 'backlog', label: 'Бэклог' },
    { value: 'in_progress', label: 'В работе' },
    { value: 'review', label: 'На проверке' },
    { value: 'done', label: 'Готово' },
    { value: 'archived', label: 'Архив' },
];

const fieldLabel = 'text-xs font-medium text-[var(--text-muted)] mb-1 block';
const fieldInput = 'w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-main)] outline-none focus:border-cyan-400';

export function NodeInspector({ node, hasChildren, effectiveProgress, subtreeHours, onPatch, onClose }: Props) {
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
                    Прогресс {hasChildren ? '(авто, среднее по дочерним)' : `— ${node.progress}%`}
                </label>
                <input
                    type="range" min={0} max={100}
                    value={hasChildren ? effectiveProgress : node.progress}
                    disabled={hasChildren}
                    onChange={e => patch({ progress: Number(e.target.value) })}
                    className="w-full accent-cyan-400 disabled:opacity-50"
                />
                {hasChildren && <p className="text-[11px] text-[var(--text-muted)] mt-1">{effectiveProgress}% — вычислено из дочерних узлов</p>}
            </div>

            <div>
                <label htmlFor={`${uid}-priority`} className={fieldLabel}>Приоритет (матрица Эйзенхауэра)</label>
                <select id={`${uid}-priority`} className={fieldInput} value={node.priority} onChange={e => patch({ priority: e.target.value as Priority })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor={`${uid}-due`} className={fieldLabel}>Срок</label>
                <input id={`${uid}-due`} type="date" className={fieldInput} value={node.dueDate ?? ''}
                    onChange={e => patch({ dueDate: e.target.value || null })} />
            </div>

            <div>
                <label htmlFor={`${uid}-hours`} className={fieldLabel}>Оценка часов{hasChildren && subtreeHours > 0 ? ` (в ветке: ${subtreeHours}ч)` : ''}</label>
                <input id={`${uid}-hours`} type="number" min={0} step={0.5} className={fieldInput}
                    value={node.estimatedHours ?? ''}
                    onChange={e => patch({ estimatedHours: e.target.value === '' ? null : Number(e.target.value) })} />
            </div>

            <div>
                <label htmlFor={`${uid}-effort`} className={fieldLabel}>Тип усилия</label>
                <select id={`${uid}-effort`} className={fieldInput} value={node.effortType} onChange={e => patch({ effortType: e.target.value as EffortType })}>
                    {EFFORTS.map(f => <option key={f} value={f}>{EFFORT_LABEL[f]}</option>)}
                </select>
            </div>

            <fieldset>
                <legend className={fieldLabel}>Энергозатратность</legend>
                <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} type="button" onClick={() => patch({ energyScore: n as 1 | 2 | 3 | 4 | 5 })}
                            aria-pressed={node.energyScore >= n}
                            aria-label={`Энергозатратность ${n} из 5`}
                            className={`flex-1 h-7 rounded-lg text-xs border transition ${node.energyScore >= n ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400' : 'border-[var(--border)] text-[var(--gq-text-tertiary)]'}`}>
                            {n}
                        </button>
                    ))}
                </div>
            </fieldset>

            <div>
                <label htmlFor={`${uid}-status`} className={fieldLabel}>Статус</label>
                <select id={`${uid}-status`} className={fieldInput} value={node.status} onChange={e => patch({ status: e.target.value as NodeStatus })}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            <div>
                <label htmlFor={`${uid}-tags`} className={fieldLabel}>Теги (через запятую)</label>
                <input id={`${uid}-tags`} type="text" className={fieldInput}
                    defaultValue={node.tags.join(', ')}
                    onBlur={e => patch({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })} />
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--text-main)] cursor-pointer">
                <input type="checkbox" checked={node.isMilestone} onChange={e => patch({ isMilestone: e.target.checked })}
                    className="accent-cyan-400 w-4 h-4" />
                Это веха 🏆
            </label>

            {node.timeSpentTotal > 0 && (
                <p className="text-[11px] text-[var(--text-muted)]">Времени в этой ветке: {node.timeSpentTotal} мин</p>
            )}
        </div>
    );
}
