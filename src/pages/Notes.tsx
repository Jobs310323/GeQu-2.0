import { useState } from 'react';
import { marked } from 'marked';

export function Notes({ notes, setNotes }: any) {
    const [text, setText] = useState('');
    const [query, setQuery] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');

    const addNote = () => {
        if (!text.trim()) return;
        setNotes([{ id: Date.now(), text, color: Math.floor(Math.random() * 360), pinned: false, date: new Date().toISOString() }, ...notes]);
        setText('');
    };
    const deleteNote = (id: number) => setNotes(notes.filter((n: any) => n.id !== id));
    const togglePin = (id: number) => setNotes(notes.map((n: any) => n.id === id ? { ...n, pinned: !n.pinned } : n));
    const startEdit = (n: any) => { setEditingId(n.id); setEditText(n.text); };
    const saveEdit = (id: number) => {
        if (!editText.trim()) return;
        setNotes(notes.map((n: any) => n.id === id ? { ...n, text: editText } : n));
        setEditingId(null);
    };

    const q = query.trim().toLowerCase();
    const visible = [...notes]
        .filter((n: any) => !q || n.text.toLowerCase().includes(q))
        .sort((a: any, b: any) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Быстрые записки</h1>
            <p className="text-gray-400 text-sm mb-6">Поддерживается Markdown: <b>**жирный**</b>, <i>*курсив*</i>, <b># Заголовок</b>, <b>- список</b>.</p>

            <div className="glass-card p-6 rounded-2xl mb-6 flex flex-col gap-4">
                <textarea value={text} onChange={e => setText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) addNote(); }}
                    placeholder="Запиши мысль… (Ctrl+Enter — прикрепить)"
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                <button onClick={addNote} className="self-start bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Прикрепить</button>
            </div>

            {notes.length > 0 && (
                <div className="mb-6 flex items-center gap-3">
                    <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Поиск по запискам…"
                        className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-2 outline-none focus:border-cyan-400 text-white" />
                    <span className="text-xs text-gray-500 whitespace-nowrap">{visible.length} из {notes.length}</span>
                </div>
            )}

            {visible.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl text-center text-gray-500">
                    {notes.length === 0 ? 'Пока нет записок — прикрепи первую мысль.' : 'Ничего не найдено.'}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                    {visible.map((note: any) => (
                        <div key={note.id} className="note-card lift relative p-4 rounded-xl shadow-lg min-h-[150px] overflow-hidden flex flex-col"
                            style={{ backgroundColor: `hsla(${note.color}, 70%, 50%, 0.18)`, border: `1px solid hsla(${note.color}, 70%, 50%, ${note.pinned ? 0.9 : 0.4})` }}>
                            <div className="flex justify-end gap-1 mb-1 -mt-1 -mr-1">
                                <button onClick={() => togglePin(note.id)} title={note.pinned ? 'Открепить' : 'Закрепить'}
                                    className={`text-sm px-1 transition ${note.pinned ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}>📌</button>
                                <button onClick={() => startEdit(note)} title="Изменить"
                                    className="text-sm px-1 opacity-40 hover:opacity-100 transition">✏️</button>
                                <button onClick={() => deleteNote(note.id)} title="Удалить"
                                    className="text-sm px-1 text-white/60 hover:text-white transition">✕</button>
                            </div>

                            {editingId === note.id ? (
                                <div className="flex flex-col gap-2">
                                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                                        className="bg-black/30 border border-white/20 rounded p-2 text-white text-sm outline-none min-h-[80px]" />
                                    <div className="flex gap-3 text-sm">
                                        <button onClick={() => saveEdit(note.id)} className="text-green-300 hover:underline">Сохранить</button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-300 hover:underline">Отмена</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="text-white markdown-content flex-1" dangerouslySetInnerHTML={{ __html: marked.parse(note.text) as string }} />
                                    {note.date && <div className="text-[10px] text-white/40 mt-3">{new Date(note.date).toLocaleDateString('ru-RU')}</div>}
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
