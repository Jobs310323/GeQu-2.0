import { useState } from 'react';
import { marked } from 'marked';

export function Notes({ notes, setNotes }: any) {
    const [text, setText] = useState('');
    const addNote = () => {
        if (!text.trim()) return;
        setNotes([{ id: Date.now(), text, color: Math.floor(Math.random()*360) }, ...notes]);
        setText('');
    };
    const deleteNote = (id: number) => setNotes(notes.filter((n: any) => n.id !== id));

    return (
        <div>
            <h1 className="text-3xl font-bold mb-2">Быстрые записки</h1>
            <p className="text-gray-400 text-sm mb-6">Поддерживается Markdown: <b>**жирный**</b>, <i>*курсив*</i>, <b># Заголовок</b>, <b>- список</b>.</p>
            <div className="glass-card p-6 rounded-2xl mb-6 flex flex-col gap-4">
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Запиши мысль..."
                    className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 outline-none focus:border-cyan-400 min-h-[80px] text-white" />
                <button onClick={addNote} className="self-start bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Прикрепить</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {notes.map((note:any) => (
                    <div key={note.id} className="note-card relative p-4 rounded-lg shadow-lg min-h-[150px] overflow-hidden"
                        style={{ backgroundColor: `hsla(${note.color}, 70%, 50%, 0.2)`, border: `1px solid hsla(${note.color}, 70%, 50%, 0.4)` }}>
                        <div className="text-white markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(note.text) }}></div>
                        <button onClick={() => deleteNote(note.id)} className="absolute top-2 right-2 text-white/50 hover:text-white text-sm">✕</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
