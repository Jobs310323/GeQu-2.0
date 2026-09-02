import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import type { KanbanProps } from '../types/props';
import type { TaskPriority, TaskStatus } from '../types/domain';

/** Board columns in order; moving a card walks this list. */
const STAGES = ['todo', 'doing', 'done'] as const satisfies readonly TaskStatus[];
const STAGE_LABEL_KEY: Record<TaskStatus, string> = {
    todo: 'plan:kanban.stage.todo',
    doing: 'plan:kanban.stage.doing',
    done: 'plan:kanban.stage.done',
};
const PRIORITY_LABEL_KEY: Record<TaskPriority, string> = {
    low: 'plan:kanban.priorityLabel.low',
    medium: 'plan:kanban.priorityLabel.medium',
    high: 'plan:kanban.priorityLabel.high',
};
const PRIORITY_CLASS: Record<TaskPriority, string> = {
    high: 'bg-red-500/20 text-red-400 border-red-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-green-500/20 text-green-400 border-green-500/30',
};

export function Kanban({ kanban, setKanban }: KanbanProps) {
    const { t } = useTranslation('plan');
    const [newTask, setNewTask] = useState('');
    const [newPriority, setNewPriority] = useState<TaskPriority>('low');
    const [draggedId, setDraggedId] = useState<number | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const addTask = () => {
        if (!newTask.trim()) return;
        setKanban([...kanban, { id: Date.now(), text: newTask, status: 'todo', priority: newPriority }]);
        setNewTask('');
    };
    /* Moving a card is the one action with no visible confirmation of its own:
       the card simply appears elsewhere on screen. A pointer user watched it
       move; a screen-reader user gets nothing unless it is announced. */
    const [announcement, setAnnouncement] = useState('');
    const moveTask = (id: number, dir: number) => {
        setKanban(kanban.map(task => {
            if (task.id === id) {
                const nextIndex = STAGES.indexOf(task.status) + dir;
                const next = STAGES[nextIndex];
                if (next) {
                    setAnnouncement(t('plan:kanban.moved', { text: task.text, stage: t(STAGE_LABEL_KEY[next]) }));
                    return { ...task, status: next };
                }
            }
            return task;
        }));
    };
    const setStatus = (id: number, status: TaskStatus) => setKanban(kanban.map(task => task.id === id ? { ...task, status } : task));
    const deleteTask = (id: number) => setKanban(kanban.filter((task) => task.id !== id));

    const columns: { id: TaskStatus; title: string; color: string }[] = [
        { id: 'todo', title: t(STAGE_LABEL_KEY.todo), color: 'text-gray-400' },
        { id: 'doing', title: t(STAGE_LABEL_KEY.doing), color: 'text-cyan-400' },
        { id: 'done', title: t(STAGE_LABEL_KEY.done), color: 'text-green-400' },
    ];

    return (
        <div>
            <PageHeader page="kanban" title={t('plan:kanban.title')} />

            {/* Announces the result of a move. `polite` so it waits for a pause
                rather than cutting across whatever is being read. */}
            <p aria-live="polite" className="sr-only">{announcement}</p>
            <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-3">
                <input type="text" value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()}
                    placeholder={t('plan:kanban.newPlaceholder')} className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 outline-none focus:border-cyan-400 text-white" />
                <select value={newPriority} onChange={e => setNewPriority(e.target.value as TaskPriority)} className="bg-[var(--bg-input)] border border-[var(--border)] rounded-xl px-4 py-2 outline-none focus:border-cyan-400 text-white">
                    <option value="low">{t('plan:kanban.priorityOption.low')}</option>
                    <option value="medium">{t('plan:kanban.priorityOption.medium')}</option>
                    <option value="high">{t('plan:kanban.priorityOption.high')}</option>
                </select>
                <button onClick={addTask} className="bg-cyan-400 text-black font-bold px-6 py-2 rounded-xl">{t('plan:kanban.add')}</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map(col => (
                    <div
                        key={col.id}
                        className={`glass-card p-4 rounded-2xl min-h-[400px] transition-colors duration-200 ${dragOverCol === col.id ? 'ring-2 ring-cyan-400 bg-cyan-400/5' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
                        onDragLeave={() => setDragOverCol(prev => prev === col.id ? null : prev)}
                        onDrop={e => {
                            e.preventDefault();
                            setDragOverCol(null);
                            const id = draggedId ?? Number(e.dataTransfer.getData('text/plain'));
                            if (id) setStatus(id, col.id);
                            setDraggedId(null);
                        }}
                    >
                        <h2 className={`text-lg font-bold mb-4 ${col.color}`}>{col.title} ({kanban.filter(task => task.status === col.id).length})</h2>
                        <div className="space-y-3">
                            {kanban.filter(task => task.status === col.id).map(task => (
                                <div
                                    key={task.id}
                                    draggable
                                    onDragStart={e => { setDraggedId(task.id); e.dataTransfer.setData('text/plain', String(task.id)); e.dataTransfer.effectAllowed = 'move'; }}
                                    onDragEnd={() => { setDraggedId(null); setDragOverCol(null); }}
                                    className={`bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)] cursor-grab active:cursor-grabbing transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-lg hover:border-cyan-400/50 ${draggedId === task.id ? 'opacity-30 scale-95' : 'opacity-100'}`}
                                >
                                    <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full w-fit mb-2 border ${PRIORITY_CLASS[task.priority]}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                                        {t(PRIORITY_LABEL_KEY[task.priority])}
                                    </div>
                                    <p className="text-sm mb-3 text-white">{task.text}</p>
                                    <div className="flex justify-between items-center">
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => moveTask(task.id, -1)} disabled={col.id === 'todo'}
                                                aria-label={t('plan:kanban.moveBack', { text: task.text })}
                                                className="p-1 bg-white/5 rounded-lg disabled:opacity-20 hover:bg-white/10 transition-colors">
                                                <Icon name="chevronLeft" size={14} />
                                            </button>
                                            <button type="button" onClick={() => moveTask(task.id, 1)} disabled={col.id === 'done'}
                                                aria-label={t('plan:kanban.moveForward', { text: task.text })}
                                                className="p-1 bg-white/5 rounded-lg disabled:opacity-20 hover:bg-white/10 transition-colors">
                                                <Icon name="chevronRight" size={14} />
                                            </button>
                                        </div>
                                        <button type="button" onClick={() => deleteTask(task.id)}
                                            aria-label={t('plan:kanban.delete', { text: task.text })}
                                            className="p-1 text-red-400 hover:text-red-300 transition-colors">
                                            <Icon name="close" size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
