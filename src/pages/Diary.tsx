import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateTime } from '../lib/format';
import { marked } from 'marked';
import { streamAI } from '../lib/ai';
import { Icon } from '../components/Icons';
import { PageHeader } from '../components/PageHeader';
import { nowInstant } from '../lib/datetime';
import type { DiaryProps } from '../types/props';
import { errorMessage } from '../lib/helpers';

// The journal reader's system prompt lives in the locale files — see ADR-006.

export function Diary({ diary, setDiary }: DiaryProps) {
    const { t } = useTranslation(['track', 'common']);
    const [newEntry, setNewEntry] = useState('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState('');
    const [query, setQuery] = useState('');
    const [aiOutput, setAiOutput] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const analyzeJournal = async () => {
        const entries = diary.slice(0, 15); // diary is newest-first
        if (entries.length === 0) { setAiError(t('track:journal.aiNoEntries')); return; }
        const context = entries
            .map((e) => `[${formatDate(e.date)}] ${e.content}`)
            .join('\n\n');
        setAiLoading(true);
        setAiError('');
        setAiOutput('');
        try {
            await streamAI({
                system: t('track:journal.aiSystem'),
                maxTokens: 900,
                messages: [{ role: 'user', content: t('track:journal.aiPrompt', { entries: context }) }],
                onToken: (chunk) => setAiOutput(prev => prev + chunk),
            });
        } catch (e) {
            setAiError(errorMessage(e, t('track:journal.aiFailed')));
        } finally {
            setAiLoading(false);
        }
    };
    const addEntry = () => { if (!newEntry.trim()) return; setDiary([{ id: Date.now(), date: nowInstant(), content: newEntry }, ...diary]); setNewEntry(''); };
    const deleteEntry = (id: number) => setDiary(diary.filter(entry => entry.id !== id));
    const saveEdit = (id: number) => { setDiary(diary.map(entry => (entry.id === id ? { ...entry, content: editText } : entry))); setEditingId(null); };

    const q = query.trim().toLowerCase();
    const visible = q ? diary.filter((e) => e.content.toLowerCase().includes(q)) : diary;

    return (
        <div>
            <PageHeader page="diary" title={t('track:journal.title')} subtitle={t('track:journal.subtitle')} />
            <div className="glass-card p-6 rounded-2xl mb-6">
                <h2 className="text-xl mb-4">{t('track:journal.newEntry')}</h2>
                <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-3 mb-3 min-h-[100px] outline-none focus:border-cyan-400 text-white" placeholder={t('track:journal.placeholder')} value={newEntry} onChange={e => setNewEntry(e.target.value)} />
                <button onClick={addEntry} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-xl">{t('track:journal.add')}</button>
            </div>

            {/* The AI read of the journal. */}
            <div className="glass-card p-6 rounded-2xl mb-6 border border-purple-400/30 bg-purple-400/5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1 flex items-start gap-2.5">
                        <Icon name="sparkle" size={18} className="text-purple-400 mt-0.5 shrink-0" />
                        <div>
                            <h2 className="text-lg font-bold text-purple-400 mb-1">{t('track:journal.aiHeading')}</h2>
                            <p className="text-sm text-gray-400">{t('track:journal.aiBlurb')}</p>
                        </div>
                    </div>
                    <button onClick={analyzeJournal} disabled={aiLoading || diary.length === 0}
                        className="bg-gradient-to-r from-purple-400 to-pink-400 text-black font-bold px-6 py-3 rounded-xl disabled:opacity-40 whitespace-nowrap">
                        {aiLoading ? t('track:journal.reading') : aiOutput ? t('track:journal.refresh') : t('track:journal.analyse')}
                    </button>
                </div>

                {aiError && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{aiError}</div>}

                {(aiOutput || aiLoading) && (
                    <div className="mt-5 pt-5 border-t border-[var(--border)]">
                        {aiOutput
                            ? <div className="text-gray-200 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(aiOutput) as string }} />
                            : <div className="text-gray-500 text-sm animate-pulse">{t('track:journal.readingEntries')}</div>}
                    </div>
                )}
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h2 className="text-xl">{t('track:journal.history')}</h2>
                    {diary.length > 0 && (
                        <div className="flex items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Icon name="search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder={t('track:journal.search')}
                                    className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-cyan-400 text-white" />
                            </div>
                            <span className="text-xs text-gray-500 whitespace-nowrap">{t('track:journal.countOf', { shown: visible.length, total: diary.length })}</span>
                        </div>
                    )}
                </div>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {visible.length === 0 && (
                        <p className="text-gray-500 text-sm text-center py-6">{diary.length === 0 ? t('track:journal.noEntries') : t('track:journal.noMatches')}</p>
                    )}
                    {visible.map(entry => (
                        <div key={entry.id} className="border-b border-[var(--border)] pb-4 anim-fade-in">
                            <div className="text-xs text-cyan-400 mb-2">{formatDateTime(entry.date)}</div>
                            {editingId === entry.id ? (
                                <div>
                                    <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-2 mb-2 outline-none focus:border-cyan-400 text-white" value={editText} onChange={e => setEditText(e.target.value)} />
                                    <div className="flex gap-4">
                                        <button onClick={() => saveEdit(entry.id)} className="text-green-400 text-sm hover:underline">{t('track:journal.save')}</button>
                                        <button onClick={() => setEditingId(null)} className="text-gray-400 text-sm hover:underline">{t('track:journal.cancel')}</button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="text-gray-300 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(entry.content) }}></div>
                                    <div className="mt-2 flex gap-4">
                                        <button onClick={() => { setEditingId(entry.id); setEditText(entry.content); }} className="flex items-center gap-1.5 text-purple-400 text-sm hover:underline">
                                            <Icon name="edit" size={13} /> {t('track:journal.edit')}
                                        </button>
                                        <button onClick={() => deleteEntry(entry.id)} className="flex items-center gap-1.5 text-red-400 text-sm hover:underline">
                                            <Icon name="trash" size={13} /> {t('track:journal.delete')}
                                        </button>
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
