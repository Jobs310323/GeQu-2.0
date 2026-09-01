import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { muscleLabel } from './vocabulary';
import { callAIJson, hasGroqKey } from '../../lib/ai';
import type { ProgramDay } from '../../types/domain';
import type { ProgramImportProps } from '../../types/props';
import { errorMessage } from '../../lib/helpers';
import type { Program, ProgramExercise } from '../../types/domain';
import { Modal } from '../../components/Modal';

type ParsedExercise = { name: string; muscle: string; sets: number; reps: string };
type ParsedDay = { name: string; exercises: ParsedExercise[] };
type ParsedProgram = { name: string; days: ParsedDay[] };

// The parser's system prompt lives in the locale files, like the coach's.
//
// Note the muscle rule inside it: the model is told to return the Russian
// muscle identifiers verbatim even from English input. Those strings are stored
// values (see `vocabulary.ts`), so an imported programme has to speak the same
// vocabulary as one entered by hand, or its exercises would never group with
// anything else on the records screen.

/** Shapes whatever came back into exactly what the gym state expects. */
function normalize(parsed: ParsedProgram, t: TFunction): Program {
    const now = Date.now();
    return {
        id: now,
        name: String(parsed?.name || t('gym:import.defaultProgramName')).slice(0, 80),
        days: (Array.isArray(parsed?.days) ? parsed.days : []).map((d, di) => ({
            id: now + di + 1,
            name: String(d?.name || t('gym:import.defaultDayName', { n: di + 1 })).slice(0, 60),
            exercises: (Array.isArray(d?.exercises) ? d.exercises : []).map((e, ei) => ({
                // ProgramEditor keys exercises by id, so imported ones need one too.
                id: now + (di + 1) * 1000 + ei,
                name: String(e?.name || t('gym:import.defaultExerciseName')).slice(0, 80),
                muscle: String(e?.muscle || '—').slice(0, 30),
                // Imported programs are treated as strength work: the pasted
                // formats carry sets and reps but nothing that identifies cardio,
                // and guessing would mis-shape the logging UI for that exercise.
                type: 'strength' as const,
                sets: Math.min(Math.max(parseInt(String(e?.sets)) || 3, 1), 12),
                reps: String(e?.reps || '8-12').slice(0, 20),
            })),
        })).filter(d => d.exercises.length > 0),
    };
}

export function ProgramImport({ gymData, setGymData, onClose }: ProgramImportProps) {
    const { t } = useTranslation('gym');
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<Program | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const parse = async () => {
        const raw = text.trim();
        if (!raw) { setError(t('gym:import.empty')); return; }
        setLoading(true); setError(''); setPreview(null);

        // Pasted JSON needs no AI round-trip.
        try {
            const direct = JSON.parse(raw);
            if (direct && Array.isArray(direct.days)) {
                const normalized = normalize(direct, t);
                if (normalized.days.length) {
                    setPreview(normalized);
                    setLoading(false);
                    return;
                }
            }
        } catch {
            // not JSON — fall through to the AI parser
        }

        if (!hasGroqKey()) {
            setError(t('gym:import.needKey'));
            setLoading(false);
            return;
        }

        try {
            const parsed = await callAIJson<ParsedProgram>({
                system: t('gym:import.system'),
                prompt: t('gym:import.userPrompt', { text: raw.slice(0, 6000) }),
                maxTokens: 2500,
            });
            const normalized = normalize(parsed, t);
            if (!normalized.days.length) {
                setError(t('gym:import.noExercises'));
            } else {
                setPreview(normalized);
            }
        } catch (e) {
            setError(errorMessage(e, t('gym:import.failed')));
        } finally {
            setLoading(false);
        }
    };

    const confirm = () => {
        // The button is only rendered with a preview, but the type does not know
        // that and a stale click during a re-parse should be a no-op, not a crash.
        if (!preview) return;
        setGymData({
            ...gymData,
            programs: [...(gymData.programs ?? []), preview],
            activeProgramId: preview.id,
        });
        onClose();
    };

    const exerciseCount = preview?.days.reduce((s: number, d: ProgramDay) => s + d.exercises.length, 0) ?? 0;

    return (
        <Modal
            title={t('gym:import.title')}
            subtitle={t('gym:import.subtitle')}
            onClose={onClose}
            size="lg"
        >

                {!preview ? (
                    <>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={t('gym:import.placeholder')}
                            className="w-full h-56 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 resize-none font-mono"
                        />
                        {error && <div className="mt-3 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}
                        <div className="flex gap-3 mt-4">
                            <button onClick={parse} disabled={loading}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40">
                                {loading ? t('gym:import.parsing') : t('gym:import.parse')}
                            </button>
                            <button onClick={onClose} className="px-6 py-3 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white">
                                {t('gym:import.cancel')}
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4 p-3 rounded-xl bg-green-400/10 border border-green-400/30 text-green-400 text-sm">
                            {t('gym:import.parsed', { days: preview.days.length, exercises: exerciseCount })}
                        </div>

                        <input
                            value={preview.name}
                            onChange={e => setPreview({ ...preview, name: e.target.value })}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4 text-white font-bold outline-none focus:border-cyan-400"
                        />

                        <div className="space-y-3 mb-5">
                            {preview.days.map((d: ProgramDay) => (
                                <div key={d.id} className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                    <div className="font-bold text-cyan-400 mb-2">{d.name}</div>
                                    <div className="space-y-1">
                                        {d.exercises.map((ex: ProgramExercise, i: number) => (
                                            <div key={i} className="flex justify-between text-sm gap-3">
                                                <span className="text-gray-200 truncate">{ex.name}</span>
                                                <span className="text-gray-500 whitespace-nowrap">
                                                    {muscleLabel(ex.muscle, t)} · {ex.sets}×{ex.reps}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={confirm}
                                className="bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold px-6 py-3 rounded-lg">
                                {t('gym:import.confirm')}
                            </button>
                            <button onClick={() => setPreview(null)}
                                className="px-6 py-3 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white">
                                {t('gym:import.back')}
                            </button>
                        </div>
                    </>
                )}
        </Modal>
    );
}
