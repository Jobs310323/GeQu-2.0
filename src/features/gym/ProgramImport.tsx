import { useState } from 'react';
import { callAIJson, hasGroqKey } from '../../lib/ai';
import { Icon } from '../../components/Icons';

type ParsedExercise = { name: string; muscle: string; sets: number; reps: string };
type ParsedDay = { name: string; exercises: ParsedExercise[] };
type ParsedProgram = { name: string; days: ParsedDay[] };

const IMPORT_SYSTEM = `Ты — парсер программ тренировок. Тебе дают произвольный текст (от ИИ, из статьи, из заметок) с программой тренировок на русском или английском.

Извлеки структуру и верни СТРОГО один JSON-объект:
{"name": "название программы", "days": [{"name": "название дня", "exercises": [{"name": "упражнение", "muscle": "мышечная группа", "sets": число, "reps": "диапазон повторений"}]}]}

Правила:
- "sets" — целое число подходов. Если не указано, ставь 3.
- "reps" — строка вроде "8-12" или "10". Если не указано, ставь "8-12".
- "muscle" — одна из: Грудь, Спина, Ноги, Плечи, Руки, Пресс, Всё тело. Определи по упражнению.
- Названия упражнений и дней переводи/пиши по-русски.
- Не выдумывай упражнения, которых нет в тексте. Сохрани их порядок.
- Если дни явно не размечены, сгруппируй разумно в один день "День 1".

Никакого текста вне JSON.`;

/** Shapes whatever came back into exactly what the gym state expects. */
function normalize(parsed: ParsedProgram) {
    const now = Date.now();
    return {
        id: now,
        name: String(parsed?.name || 'Импортированная программа').slice(0, 80),
        days: (Array.isArray(parsed?.days) ? parsed.days : []).map((d, di) => ({
            id: now + di + 1,
            name: String(d?.name || `День ${di + 1}`).slice(0, 60),
            exercises: (Array.isArray(d?.exercises) ? d.exercises : []).map((e, ei) => ({
                // ProgramEditor keys exercises by id, so imported ones need one too.
                id: now + (di + 1) * 1000 + ei,
                name: String(e?.name || 'Упражнение').slice(0, 80),
                muscle: String(e?.muscle || '—').slice(0, 30),
                sets: Math.min(Math.max(parseInt(String(e?.sets)) || 3, 1), 12),
                reps: String(e?.reps || '8-12').slice(0, 20),
            })),
        })).filter(d => d.exercises.length > 0),
    };
}

export function ProgramImport({ gymData, setGymData, onClose }: any) {
    const [text, setText] = useState('');
    const [preview, setPreview] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const parse = async () => {
        const raw = text.trim();
        if (!raw) { setError('Вставь текст программы.'); return; }
        setLoading(true); setError(''); setPreview(null);

        // Pasted JSON needs no AI round-trip.
        try {
            const direct = JSON.parse(raw);
            if (direct && Array.isArray(direct.days)) {
                const normalized = normalize(direct);
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
            setError('Для разбора обычного текста нужен ключ Groq (Настройки). Либо вставь программу в формате JSON.');
            setLoading(false);
            return;
        }

        try {
            const parsed = await callAIJson<ParsedProgram>({
                system: IMPORT_SYSTEM,
                prompt: `Разбери эту программу тренировок:\n\n${raw.slice(0, 6000)}`,
                maxTokens: 2500,
            });
            const normalized = normalize(parsed);
            if (!normalized.days.length) {
                setError('Не удалось найти упражнения в тексте. Проверь, что программа указана полностью.');
            } else {
                setPreview(normalized);
            }
        } catch (e: any) {
            setError(e?.message || 'Не удалось разобрать программу.');
        } finally {
            setLoading(false);
        }
    };

    const confirm = () => {
        setGymData({
            ...gymData,
            programs: [...(gymData.programs ?? []), preview],
            activeProgramId: preview.id,
        });
        onClose();
    };

    const exerciseCount = preview?.days.reduce((s: number, d: any) => s + d.exercises.length, 0) ?? 0;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="glass-card p-6 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-cyan-400/30"
                onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white">Импорт программы</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Вставь программу в любом виде — списком, таблицей, текстом от ИИ. Я разберу её сам.
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-white/5 transition">
                        <Icon name="close" size={18} />
                    </button>
                </div>

                {!preview ? (
                    <>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder={'Например:\n\nДень 1 — Грудь и трицепс\nЖим лёжа 4х8-10\nРазводка гантелей 3х12\n\nДень 2 — Спина\nПодтягивания 4х макс\nТяга штанги 4х8'}
                            className="w-full h-56 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-3 text-sm text-white outline-none focus:border-cyan-400 resize-none font-mono"
                        />
                        {error && <div className="mt-3 p-3 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>}
                        <div className="flex gap-3 mt-4">
                            <button onClick={parse} disabled={loading}
                                className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-40">
                                {loading ? 'Разбираю…' : 'Разобрать программу'}
                            </button>
                            <button onClick={onClose} className="px-6 py-3 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white">
                                Отмена
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="mb-4 p-3 rounded-xl bg-green-400/10 border border-green-400/30 text-green-400 text-sm">
                            Разобрано: <b>{preview.days.length}</b> дн., <b>{exerciseCount}</b> упражнений. Проверь и подтверди.
                        </div>

                        <input
                            value={preview.name}
                            onChange={e => setPreview({ ...preview, name: e.target.value })}
                            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 mb-4 text-white font-bold outline-none focus:border-cyan-400"
                        />

                        <div className="space-y-3 mb-5">
                            {preview.days.map((d: any) => (
                                <div key={d.id} className="bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--border)]">
                                    <div className="font-bold text-cyan-400 mb-2">{d.name}</div>
                                    <div className="space-y-1">
                                        {d.exercises.map((ex: any, i: number) => (
                                            <div key={i} className="flex justify-between text-sm gap-3">
                                                <span className="text-gray-200 truncate">{ex.name}</span>
                                                <span className="text-gray-500 whitespace-nowrap">
                                                    {ex.muscle} · {ex.sets}×{ex.reps}
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
                                Добавить и сделать активной
                            </button>
                            <button onClick={() => setPreview(null)}
                                className="px-6 py-3 rounded-lg border border-[var(--border)] text-gray-400 hover:text-white">
                                Назад
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
