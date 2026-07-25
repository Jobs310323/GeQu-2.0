import { useState } from 'react';
import { DISTORTIONS, PRACTICES, RECORD_FIELDS } from '../lib/cbt';
import { streamAI, hasGroqKey } from '../lib/ai';
import { marked } from 'marked';

const TABS = [
    { id: 'record', label: 'Дневник мыслей' },
    { id: 'distortions', label: 'Искажения' },
    { id: 'practices', label: 'Практики' },
];

const AI_SYSTEM = `Ты — бережный помощник по когнитивно-поведенческой терапии в приложении GeQu. Пользователь — человек с СДВГ.

Тебе дают заполненную запись дневника мыслей: ситуация, автоматическая мысль, эмоция, доводы за и против, альтернативная мысль.

Сделай три вещи, кратко:
1. Назови когнитивные искажения, которые видны в автоматической мысли (из списка: всё или ничего, катастрофизация, долженствование, чтение мыслей, негативный фильтр, ярлыки, сверхобобщение, эмоциональное обоснование, персонализация, обесценивание успеха). Только те, что реально есть.
2. Задай 1–2 вопроса, которые помогут посмотреть на ситуацию точнее.
3. Предложи одну более взвешенную формулировку мысли — не «всё хорошо», а честнее и точнее.

Пиши по-русски, на «ты», тепло и без нравоучений. Формат — короткий Markdown с подзаголовками. Опирайся только на то, что написано в записи.`;

function emptyRecord() {
    return RECORD_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as Record<string, string>);
}

export function Cbt({ cbtRecords, setCbtRecords }: any) {
    const [tab, setTab] = useState('record');
    const [draft, setDraft] = useState<Record<string, string>>(emptyRecord);
    const [aiOut, setAiOut] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const records = cbtRecords ?? [];
    const filled = RECORD_FIELDS.filter(f => draft[f.key]?.trim()).length;
    const canSave = draft.situation?.trim() && draft.thought?.trim();

    const save = () => {
        if (!canSave) return;
        setCbtRecords([{ id: Date.now(), date: new Date().toISOString(), ...draft }, ...records]);
        setDraft(emptyRecord());
        setAiOut('');
    };

    const analyse = async () => {
        setAiLoading(true); setAiError(''); setAiOut('');
        try {
            const body = RECORD_FIELDS
                .filter(f => draft[f.key]?.trim())
                .map(f => `${f.label}: ${draft[f.key]}`)
                .join('\n');
            await streamAI({
                system: AI_SYSTEM,
                maxTokens: 800,
                messages: [{ role: 'user', content: `Вот моя запись:\n\n${body}\n\nПомоги разобрать.` }],
                onToken: c => setAiOut(p => p + c),
            });
        } catch (e: any) {
            setAiError(e?.message || 'Не удалось получить разбор.');
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <h1 className="text-3xl font-bold mb-2">КПТ-практика</h1>
            <p className="text-gray-400 text-sm mb-6">
                Инструменты когнитивно-поведенческой терапии: разбирать мысли, узнавать свои искажения и действовать, не дожидаясь настроения.
            </p>

            <div className="flex gap-2 mb-6 flex-wrap">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)}
                        className={`px-4 py-2 rounded-lg transition text-sm ${
                            tab === t.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'
                        }`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'record' && (
                <>
                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-xl font-bold">Новая запись</h2>
                            <span className="text-xs text-gray-500">{filled} из {RECORD_FIELDS.length} полей</span>
                        </div>

                        <div className="space-y-4">
                            {RECORD_FIELDS.map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm text-gray-300 mb-1">{f.label}</label>
                                    <textarea
                                        value={draft[f.key]}
                                        onChange={e => setDraft(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.hint}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 text-sm text-white outline-none focus:border-cyan-400 min-h-[60px] resize-y"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3 mt-5">
                            <button onClick={save} disabled={!canSave}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2.5 rounded-lg disabled:opacity-40">
                                Сохранить запись
                            </button>
                            <button onClick={analyse} disabled={aiLoading || !canSave || !hasGroqKey()}
                                title={!hasGroqKey() ? 'Нужен ключ Groq в Настройках' : undefined}
                                className="px-6 py-2.5 rounded-lg border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 disabled:opacity-40 transition">
                                {aiLoading ? 'Разбираю…' : '✨ Разобрать с ИИ'}
                            </button>
                            {!canSave && <span className="text-xs text-gray-500 self-center">Заполни хотя бы ситуацию и мысль</span>}
                        </div>

                        {aiError && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{aiError}</div>}
                        {aiOut && (
                            <div className="mt-5 pt-5 border-t border-[var(--border)] text-gray-200 markdown-content"
                                dangerouslySetInnerHTML={{ __html: marked.parse(aiOut) as string }} />
                        )}
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-xl font-bold">История разборов</h2>
                            <span className="text-xs text-gray-500">{records.length}</span>
                        </div>
                        {records.length === 0 ? (
                            <p className="text-sm text-gray-500">Пока пусто. Первая запись — самая полезная.</p>
                        ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                                {records.map((r: any) => (
                                    <div key={r.id} className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)] anim-fade-in">
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <span className="text-xs text-cyan-400">
                                                {new Date(r.date).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <button onClick={() => setCbtRecords(records.filter((x: any) => x.id !== r.id))}
                                                className="text-red-400 text-xs hover:underline">Удалить</button>
                                        </div>
                                        {RECORD_FIELDS.filter(f => r[f.key]?.trim()).map(f => (
                                            <div key={f.key} className="mb-1.5 last:mb-0">
                                                <span className="text-[11px] text-gray-500">{f.label}: </span>
                                                <span className={`text-sm ${f.key === 'alternative' ? 'text-green-400' : 'text-gray-300'}`}>{r[f.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {tab === 'distortions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {DISTORTIONS.map(d => (
                        <div key={d.id} className="glass-card p-5 rounded-2xl">
                            <h3 className="font-bold text-cyan-400 mb-1">{d.name}</h3>
                            <p className="text-sm text-gray-300 mb-2">{d.short}</p>
                            <p className="text-sm text-gray-500 italic mb-3">{d.example}</p>
                            <div className="pt-3 border-t border-[var(--border)] flex gap-2">
                                <span className="text-purple-400">?</span>
                                <p className="text-sm text-gray-400">{d.question}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {tab === 'practices' && (
                <div className="space-y-4">
                    {PRACTICES.map(p => (
                        <div key={p.id} className="glass-card p-5 rounded-2xl">
                            <h3 className="font-bold text-lg mb-1">{p.icon} {p.title}</h3>
                            <p className="text-sm text-gray-400 mb-4">{p.why}</p>
                            <ol className="space-y-2">
                                {p.steps.map((s, i) => (
                                    <li key={i} className="flex gap-3 text-sm text-gray-300">
                                        <span className="w-5 h-5 shrink-0 rounded-full bg-cyan-400/15 text-cyan-400 text-xs flex items-center justify-center font-bold">
                                            {i + 1}
                                        </span>
                                        {s}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
