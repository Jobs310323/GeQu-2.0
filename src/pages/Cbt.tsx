import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cbtDistortions, cbtPractices, cbtRecordFields, type RecordField } from '../content/cbt';
import { streamAI, hasGroqKey } from '../lib/ai';
import { marked } from 'marked';
import { Icon } from '../components/Icons';
import { nowInstant } from '../lib/datetime';
import { getLocale } from '../i18n/locale';
import { formatDateTime } from '../lib/format';
import type { CbtProps } from '../types/props';
import type { CbtRecord } from '../types/domain';
import { errorMessage } from '../lib/helpers';

function emptyRecord(fields: readonly RecordField[]) {
    return fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {} as Record<string, string>);
}

export function Cbt({ cbtRecords, setCbtRecords }: CbtProps) {
    const { t } = useTranslation('brain');
    const locale = getLocale();
    const distortions = cbtDistortions(locale);
    const practices = cbtPractices(locale);
    const recordFields = cbtRecordFields(locale);

    const TABS = [
        { id: 'record', label: t('brain:cbt.tab.record') },
        { id: 'distortions', label: t('brain:cbt.tab.distortions') },
        { id: 'practices', label: t('brain:cbt.tab.practices') },
    ];

    const [tab, setTab] = useState('record');
    const [draft, setDraft] = useState<Record<string, string>>(() => emptyRecord(recordFields));
    const [aiOut, setAiOut] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');

    const records = cbtRecords ?? [];
    const filled = recordFields.filter(f => draft[f.key]?.trim()).length;
    const canSave = draft.situation?.trim() && draft.thought?.trim();

    const save = () => {
        // `canSave` has already checked both required fields are non-empty; the
        // cast only tells TypeScript what that guard established, since `draft`
        // is keyed dynamically from RECORD_FIELDS.
        if (!canSave) return;
        const record = { id: Date.now(), date: nowInstant(), ...draft } as CbtRecord;
        setCbtRecords([record, ...records]);
        setDraft(emptyRecord(recordFields));
        setAiOut('');
    };

    const analyse = async () => {
        setAiLoading(true); setAiError(''); setAiOut('');
        try {
            const body = recordFields
                .filter(f => draft[f.key]?.trim())
                .map(f => `${f.label}: ${draft[f.key]}`)
                .join('\n');
            await streamAI({
                system: t('brain:cbt.aiSystem'),
                maxTokens: 800,
                messages: [{ role: 'user', content: t('brain:cbt.aiUserPrefix', { body }) }],
                onToken: c => setAiOut(p => p + c),
                t,
            });
        } catch (e) {
            setAiError(errorMessage(e, t('brain:cbt.analyseFailed')));
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <div className="max-w-4xl">
            <p className="text-sm text-gray-400 mb-4">
                {t('brain:cbt.intro')}
            </p>

            <div className="mb-6 flex gap-1 flex-wrap">
                {TABS.map(tb => (
                    <button key={tb.id} onClick={() => setTab(tb.id)}
                        className={`px-3 py-1 rounded-full text-xs border transition ${
                            tab === tb.id
                                ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/40'
                                : 'border-[var(--border)] text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'
                        }`}>
                        {tb.label}
                    </button>
                ))}
            </div>

            {tab === 'record' && (
                <>
                    <div className="glass-card p-6 rounded-2xl mb-6">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-xl font-bold">{t('brain:cbt.newRecordHeading')}</h2>
                            <span className="text-xs text-gray-500">{t('brain:cbt.fieldsFilled', { filled, total: recordFields.length })}</span>
                        </div>

                        <div className="space-y-4">
                            {recordFields.map(f => (
                                <div key={f.key}>
                                    <label className="block text-sm text-gray-300 mb-1">{f.label}</label>
                                    <textarea
                                        value={draft[f.key]}
                                        onChange={e => setDraft(p => ({ ...p, [f.key]: e.target.value }))}
                                        placeholder={f.hint}
                                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 min-h-[60px] resize-y"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-wrap gap-3 mt-5">
                            <button onClick={save} disabled={!canSave}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2.5 rounded-xl disabled:opacity-40">
                                {t('brain:cbt.save')}
                            </button>
                            <button onClick={analyse} disabled={aiLoading || !canSave || !hasGroqKey()}
                                title={!hasGroqKey() ? t('brain:cbt.needKeyTitle') : undefined}
                                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 disabled:opacity-40 transition">
                                {!aiLoading && <Icon name="sparkle" size={14} />}
                                {aiLoading ? t('brain:cbt.analysing') : t('brain:cbt.analyse')}
                            </button>
                            {!canSave && <span className="text-xs text-gray-500 self-center">{t('brain:cbt.needBothFields')}</span>}
                        </div>

                        {aiError && <div className="mt-4 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{aiError}</div>}
                        {aiOut && (
                            <div className="mt-5 pt-5 border-t border-[var(--border)] text-gray-200 markdown-content"
                                dangerouslySetInnerHTML={{ __html: marked.parse(aiOut) as string }} />
                        )}
                    </div>

                    <div className="glass-card p-6 rounded-2xl">
                        <div className="flex items-baseline justify-between mb-4">
                            <h2 className="text-xl font-bold">{t('brain:cbt.historyHeading')}</h2>
                            <span className="text-xs text-gray-500">{records.length}</span>
                        </div>
                        {records.length === 0 ? (
                            <p className="text-sm text-gray-500">{t('brain:cbt.historyEmpty')}</p>
                        ) : (
                            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                                {records.map((r) => (
                                    <div key={r.id} className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border)] anim-fade-in">
                                        <div className="flex justify-between items-start gap-3 mb-2">
                                            <span className="text-xs text-cyan-400">
                                                {formatDateTime(r.date, 'dayMonth')}
                                            </span>
                                            <button onClick={() => setCbtRecords(records.filter((x) => x.id !== r.id))}
                                                className="text-red-400 text-xs hover:underline">{t('brain:cbt.delete')}</button>
                                        </div>
                                        {recordFields.filter(f => r[f.key]?.trim()).map(f => (
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
                    {distortions.map(d => (
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
                    {practices.map(p => (
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
