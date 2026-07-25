import { useState } from 'react';
import { marked } from 'marked';
import { streamAI } from '../lib/ai';

const JOURNAL_SYSTEM = `Ты — тёплый, бережный собеседник в приложении GeQu (пользователь — человек с СДВГ, ему важны ясность и поддержка).
Тебе дают последние записи из личного дневника с датами. Мягко отрефлексируй их: подметь повторяющиеся темы и настроения, что радует и что тревожит, отметь сильные стороны и маленькие победы. Дай 1–2 бережных выполнимых предложения на подумать — без давления и нравоучений.
Пиши по-русски, тепло, во втором лице («ты»), кратко и по делу, без клише и без медицинских диагнозов. Формат — Markdown с короткими разделами, например: **Что я заметил**, **Повторяющиеся темы**, **Мягкое предложение**. Опирайся только на то, что есть в записях.`;

export function Diary({ diary, setDiary }: any) {
    const [newEntry, setNewEntry] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [query, setQuery] = useState('');
    const [aiOutput, setAiOutput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const analyzeJournal = async () => {
        const entries = diary.slice(0, 15); // diary is newest-first
        if (entries.length === 0) { setAiError('Пока нет записей для разбора.'); return; }
        const context = entries
            .map((e: any) => `[${new Date(e.date).toLocaleDateString('ru-RU')}] ${e.content}`)
            .join('\n\n');
        setAiLoading(true);
        setAiError('');
        setAiOutput('');
        try {
            await streamAI({
                system: JOURNAL_SYSTEM,
                maxTokens: 900,
                messages: [{ role: 'user', content: `Мои последние записи дневника:\n\n${context}\n\nБережно разбери их.` }],
                onToken: (chunk) => setAiOutput(prev => prev + chunk),
            });
        } catch (e: any) {
            setAiError(e?.message || 'Не удалось получить разбор.');
        } finally {
            setAiLoading(false);
        }
    };
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

            {/* ИИ-разбор дневника */}
            <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-purple-400 mb-1">💭 ИИ-разбор дневника</h2>
                        <p className="text-sm text-gray-400">Мягко разберу последние записи: повторяющиеся темы, настроение, сильные стороны.</p>
                    </div>
                    <button onClick={analyzeJournal} disabled={aiLoading || diary.length === 0}
                        className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40 whitespace-nowrap">
                        {aiLoading ? 'Читаю…' : aiOutput ? 'Обновить разбор' : 'Разобрать записи'}
                    </button>
                </div>

                {aiError && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{aiError}</div>}

                {(aiOutput || aiLoading) && (
                    <div className="mt-5 pt-5 border-t border-[var(--border)]">
                        {aiOutput
                            ? <div className="text-gray-200 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(aiOutput) as string }} />
                            : <div className="text-gray-500 text-sm animate-pulse">Читаю твои записи…</div>}
                    </div>
                )}
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
