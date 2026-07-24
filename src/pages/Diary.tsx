import { useState } from 'react';
import { marked } from 'marked';

export function Diary({ diary, setDiary }: any) {
    const [newEntry, setNewEntry] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [query, setQuery] = useState('');
    const addEntry = () => { if (!newEntry.trim()) return; setDiary([{ id: Date.now(), date: new Date().toISOString(), content: newEntry }, ...diary]); setNewEntry(''); };
    const deleteEntry = (id: number) => setDiary(diary.filter((entry:any) => entry.id !== id));
    const saveEdit = (id: number) => { setDiary(diary.map((entry:any) => entry.id === id ? { ...entry, content: editText } : entry)); setEditingId(null); };

    const q = query.trim().toLowerCase();
    const visible = q ? diary.filter((e: any) => e.content.toLowerCase().includes(q)) : diary;

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Дневник мыслей</h1>
            <p className="text-gray-400 text-sm mb-6">Поддерживается Markdown для форматирования записей.</p>
            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">Новая запись</h2>
                <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 mb-3 min-h-[100px] outline-none focus:border-cyan-400 text-white" placeholder="Что у вас в голове?" value={newEntry} onChange={e => setNewEntry(e.target.value)} />
                <button onClick={addEntry} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Добавить</button>
            </div>
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl">История</h2>
                    {diary.length > 0 && (
                        <div className="flex items-center gap-3">
                            <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Поиск по дневнику…"
                                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 text-sm outline-none focus:border-cyan-400 text-white w-full sm:w-64" />
                            <span className="text-xs text-gray-500 whitespace-nowrap">{visible.length} из {diary.length}</span>
                        </div>
                    )}
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {visible.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-6">{diary.length === 0 ? 'Записей пока нет.' : 'По запросу ничего не найдено.'}</p>
                    )}
                    {visible.map((entry:any) => (
                        <div key={entry.id} className="border-b border-[var(--border)] pb-4 anim-fade-in">
                            <div className="text-xs text-cyan-400 mb-2">{new Date(entry.date).toLocaleString('ru-RU')}</div>
                            {editingId === entry.id ? (
                                <div>
                                    <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded p-2 mb-2 outline-none focus:border-cyan-400 text-white" value={editText} onChange={e => setEditText(e.target.value)} />
                                    <div className="flex gap-4">
                                        <button onClick={() => saveEdit(entry.id)} className="text-green-400 text-sm hover:underline">Сохранить</button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm hover:underline">Отмена</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-gray-300 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(entry.content) }}></div>
                                    <div className="mt-2 flex gap-4">
                                        <button onClick={() => { setEditingId(entry.id); setEditText(entry.content); }} className="text-purple-400 text-sm hover:underline">Изменить</button>
                                        <button onClick={() => deleteEntry(entry.id)} className="text-red-400 text-sm hover:underline">Удалить</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
