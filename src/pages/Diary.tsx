import { useState } from 'react';
import { marked } from 'marked';

export function Diary({ diary, setDiary }: any) {
    const [newEntry, setNewEntry] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const addEntry = () => { if (!newEntry.trim()) return; setDiary([{ id: Date.now(), date: new Date().toISOString(), content: newEntry }, ...diary]); setNewEntry(''); };
    const deleteEntry = (id: number) => setDiary(diary.filter((entry:any) => entry.id !== id));
    const saveEdit = (id: number) => { setDiary(diary.map((entry:any) => entry.id === id ? { ...entry, content: editText } : entry)); setEditingId(null); };

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
                <h2 className="text-xl mb-4">История</h2>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {diary.map((entry:any) => (
                        <div key={entry.id} className="border-b border-[var(--border)] pb-4">
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
