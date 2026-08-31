import { useRef, useState } from 'react';
import { Icon } from '../../components/Icons';
import { CollapsibleMarkdown, autoGrow } from '../../components/CollapsibleMarkdown';
import { TagChips } from '../../components/TagChips';
import { useDragReorder } from '../../lib/useDragReorder';
import type { Task } from '../../types/goals';
import { TaskInput } from './TaskInput';

type StepRowProps = {
    task: Task;
    depth?: number;
    onPatch: (taskId: number, patch: Partial<Task>) => void;
    onDelete: (taskId: number) => void;
    onAddChild: (parentId: number, text: string) => void;
    gripProps: ReturnType<typeof useDragReorder>['handleProps'];
    itemProps: ReturnType<ReturnType<typeof useDragReorder>['itemProps']>;
    itemClass: string;
};

export function StepRow({ task, depth = 0, onPatch, onDelete, onAddChild, gripProps, itemProps, itemClass }: StepRowProps) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(task.text);
    const [noteOpen, setNoteOpen] = useState(false);
    const [tagsOpen, setTagsOpen] = useState(false);
    const [addingChild, setAddingChild] = useState(false);
    const noteRef = useRef<HTMLTextAreaElement>(null);
    const hasNote = Boolean(task.note?.trim());
    const hasTags = Boolean(task.tags?.length);

    const patch = (p: Partial<Task>) => onPatch(task.id, p);

    const startEdit = () => { setDraft(task.text); setEditing(true); };
    const commit = () => {
        const text = draft.trim();
        if (text) patch({ text });
        setEditing(false);
    };

    const subDrag = useDragReorder(task.subtasks, next => patch({ subtasks: next }));

    return (
        <div className={depth > 0 ? 'pl-6 border-l border-[var(--border)]' : ''}>
            <div {...itemProps} className={`bg-[var(--bg-input)] rounded-xl ${itemClass}`}>
                <div className="flex items-center gap-2 p-3">
                    <span {...gripProps} title="Перетащить шаг"
                        className="text-[var(--text-muted)] hover:text-cyan-400 transition shrink-0">
                        <Icon name="grip" size={14} />
                    </span>
                    <input type="checkbox" checked={task.done}
                        onChange={() => patch({ done: !task.done })}
                        className="w-5 h-5 cursor-pointer shrink-0" />

                    {editing ? (
                        <input
                            autoFocus
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onBlur={commit}
                            onKeyDown={e => {
                                if (e.key === 'Enter') commit();
                                if (e.key === 'Escape') setEditing(false);
                            }}
                            className="flex-1 bg-transparent border-b border-cyan-400 outline-none text-sm py-0.5"
                        />
                    ) : (
                        <span onDoubleClick={startEdit} title="Двойной клик — изменить"
                            className={`flex-1 text-sm cursor-text ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {task.text}
                        </span>
                    )}

                    <button onClick={() => setAddingChild(v => !v)} title="Добавить шаг внутри"
                        className={`shrink-0 p-1.5 rounded-lg transition ${addingChild ? 'text-purple-400 bg-purple-400/10' : 'text-[var(--text-muted)] hover:text-purple-400'}`}>
                        <Icon name="plus" size={14} />
                    </button>
                    <button onClick={() => setNoteOpen(o => !o)} title={hasNote ? 'Заметка к шагу' : 'Добавить заметку'}
                        className={`shrink-0 p-1.5 rounded-lg transition ${hasNote || noteOpen ? 'text-cyan-400 bg-cyan-400/10' : 'text-[var(--text-muted)] hover:text-cyan-400'}`}>
                        <Icon name="note" size={14} />
                    </button>
                    <button onClick={() => setTagsOpen(o => !o)} title={hasTags ? 'Теги шага' : 'Добавить теги'}
                        className={`shrink-0 p-1.5 rounded-lg transition ${hasTags || tagsOpen ? 'text-purple-400 bg-purple-400/10' : 'text-[var(--text-muted)] hover:text-purple-400'}`}>
                        <Icon name="tag" size={14} />
                    </button>
                    <button onClick={startEdit} title="Изменить шаг"
                        className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-400 transition">
                        <Icon name="edit" size={14} />
                    </button>
                    <button onClick={() => onDelete(task.id)} title="Удалить шаг"
                        className="shrink-0 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition">
                        <Icon name="trash" size={14} />
                    </button>
                </div>

                {noteOpen ? (
                    <div className="px-3 pb-3">
                        <textarea
                            ref={noteRef}
                            autoFocus
                            value={task.note ?? ''}
                            onChange={e => { patch({ note: e.target.value }); autoGrow(e.target); }}
                            onFocus={e => autoGrow(e.target)}
                            placeholder="Что выяснилось по этому шагу… (поддерживает Markdown)"
                            rows={3}
                            className="w-full bg-black/20 border border-[var(--border)] rounded-lg p-2.5 text-sm outline-none focus:border-cyan-400 resize-none overflow-hidden"
                        />
                    </div>
                ) : hasNote && (
                    <button
                        type="button"
                        aria-label="Редактировать заметку"
                        className="px-3 pb-3 -mt-1 cursor-pointer text-left w-full"
                        onClick={() => setNoteOpen(true)}
                    >
                        <CollapsibleMarkdown text={task.note} collapsedHeight={80} />
                    </button>
                )}

                {(tagsOpen || hasTags) && (
                    <div className="px-3 pb-3 -mt-1">
                        <TagChips tags={task.tags ?? []} onChange={tags => patch({ tags })} />
                    </div>
                )}

                {addingChild && (
                    <div className="px-3 pb-3">
                        <TaskInput
                            autoFocus
                            placeholder="Шаг внутри шага..."
                            addTask={text => { onAddChild(task.id, text); setAddingChild(false); }}
                            onCancel={() => setAddingChild(false)}
                        />
                    </div>
                )}
            </div>

            {task.subtasks.length > 0 && (
                <div className="mt-2 space-y-2">
                    {task.subtasks.map((child, i) => (
                        <StepRow
                            key={child.id}
                            task={child}
                            depth={depth + 1}
                            onPatch={onPatch}
                            onDelete={onDelete}
                            onAddChild={onAddChild}
                            gripProps={subDrag.handleProps}
                            itemProps={subDrag.itemProps(i)}
                            itemClass={subDrag.itemClass(i)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
