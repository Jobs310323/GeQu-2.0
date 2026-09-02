import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { streamAI } from '../../lib/ai';
import { ProgramImport } from './ProgramImport';
import { marked } from 'marked';
import { PageHeader } from '../../components/PageHeader';
import { Icon } from '../../components/Icons';
import { useDragReorder } from '../../lib/useDragReorder';
import { todayKey, instantForDateKey, nowInstant } from '../../lib/datetime';
import { formatDate, formatNumber } from '../../lib/format';
import {
    MUSCLE_IDS, INTENSITY_IDS, CARDIO_MUSCLE, DEFAULT_INTENSITY, ALL_FILTER,
    muscleLabel, intensityLabel,
} from './vocabulary';
import type { GymProps, Setter } from '../../types/props';
import { errorMessage } from '../../lib/helpers';
import type {
    GymData, Program, ProgramDay, Workout, WorkoutExercise, WorkoutSet, ProgramExercise, ExerciseKind, DayLog,
} from '../../types/domain';

/** The tabs GymApp switches between. */
type GymView = 'home' | 'programs' | 'history' | 'pr' | 'ai' | 'active';

/**
 * Numbers out of stored workout data. These fields are numbers today, but the
 * earliest records wrote them as strings, so both are accepted rather than
 * assumed — a NaN here would silently zero a user's logged weight.
 */
const num = (v: unknown): number => {
    const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
    return Number.isFinite(n) ? n : 0;
};

// Muscle groups and intensities are stored values, not labels — see
// `vocabulary.ts` for why they stay Russian on disk in every language.

/** Exercises saved before cardio existed have no `type` — they are strength. */
const isCardio = (ex: Pick<WorkoutExercise, 'type'> | undefined) => ex?.type === 'cardio';

function GymEmptyState({ icon, text }: { icon: string; text: string }) {
    return (
        <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/5 text-[var(--text-muted)] flex items-center justify-center">
                <Icon name={icon} size={22} />
            </div>
            <p className="text-gray-400">{text}</p>
        </div>
    );
}

export function GymApp({ gymData, setGymData, logs }: GymProps) {
    const { t } = useTranslation('gym');
    const [view, setView] = useState('home');
    const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
    const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);

    const activeProgram = gymData.programs.find((p) => p.id === gymData.activeProgramId);

    const startWorkout = (day: ProgramDay, dateISO?: string) => {
        const lastHistory = [...gymData.history].reverse().find((h) => h.dayId === day.id);
        const exercises = day.exercises.map((ex) => {
            const lastEx = lastHistory?.exercises.find((e) => e.name === ex.name);
            if (isCardio(ex)) {
                const last = lastEx?.sets?.[0];
                return {
                    name: ex.name, muscle: CARDIO_MUSCLE, type: 'cardio' as const,
                    sets: [{
                        duration: num(last?.duration) || ex.duration || 20,
                        distance: num(last?.distance) || 0,
                        intensity: ex.intensity || last?.intensity || DEFAULT_INTENSITY,
                        done: false,
                    }],
                };
            }
            const sets = Array.from({ length: ex.sets }).map((_, i) => ({
                weight: num(lastEx?.sets[i]?.weight) || 0,
                reps: num(lastEx?.sets[i]?.reps) || parseInt(String(ex.reps).split('-')[0] ?? '') || 0,
                done: false
            }));
            return { name: ex.name, muscle: ex.muscle, type: 'strength' as const, sets };
        });

        setActiveWorkout({
            id: Date.now(),
            dayId: day.id,
            dayName: day.name,
            // Back-dated sessions keep the chosen day but a midday timestamp,
            // so they land on the right day in every local-time view.
            date: dateISO ?? nowInstant(),
            exercises,
            startTime: Date.now(),
            endTime: null
        });
        setView('active');
    };

    const finishWorkout = () => {
        if (activeWorkout) {
            activeWorkout.endTime = Date.now();
            const updatedHistory = [...gymData.history, activeWorkout];
            setGymData({ ...gymData, history: updatedHistory });
        }
        setActiveWorkout(null);
        setView('history');
    };

    const saveEditedWorkout = (updated?: Workout) => {
        if (!updated) return;
        const newHistory = gymData.history.map(w =>
            (w.id || w.date) === (updated.id || updated.date) ? updated : w
        );
        setGymData({ ...gymData, history: newHistory });
        setEditingWorkout(null);
    };

    if (view === 'active' && activeWorkout) {
        return <ActiveWorkoutView activeWorkout={activeWorkout} setActiveWorkout={setActiveWorkout} finishWorkout={finishWorkout} isEditing={false} />;
    }

    if (editingWorkout) {
        return <ActiveWorkoutView activeWorkout={editingWorkout} setActiveWorkout={setEditingWorkout} finishWorkout={saveEditedWorkout} isEditing={true} />;
    }

    const tabs = [
        { id: 'home', label: t('gym:tab.home') },
        { id: 'programs', label: t('gym:tab.programs') },
        { id: 'history', label: t('gym:tab.history') },
        { id: 'pr', label: t('gym:tab.pr') },
        { id: 'ai', label: t('gym:tab.ai') },
    ];

    return (
        <div>
            <PageHeader page="gym" title={t('gym:title')} />
            <div className="glass-card rounded-xl p-1.5 mb-6 flex gap-1 overflow-x-auto">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition ${view === tab.id ? 'text-cyan-400 bg-cyan-400/10 font-medium' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}>{tab.label}</button>
                ))}
            </div>

            {view === 'home' && <GymHome activeProgram={activeProgram} gymData={gymData} startWorkout={startWorkout} setView={setView} />}
            {view === 'programs' && <GymPrograms gymData={gymData} setGymData={setGymData} />}
            {view === 'history' && <GymHistory gymData={gymData} setGymData={setGymData} setEditingWorkout={setEditingWorkout} />}
            {view === 'pr' && <GymPRs gymData={gymData} />}
            {view === 'ai' && <GymAI gymData={gymData} logs={logs} />}
        </div>
    );
}

export function GymHome({ activeProgram, gymData, startWorkout, setView }: {
    activeProgram: Program | undefined;
    gymData: GymData;
    startWorkout: (day: ProgramDay, dateISO?: string) => void;
    setView: (v: GymView) => void;
}) {
    const { t } = useTranslation('gym');
    const lastWorkout = gymData.history[gymData.history.length - 1];
    const days = activeProgram?.days ?? [];

    // Suggest the day that follows the last one performed, rather than always
    // the first — that matches how a split is actually run.
    const suggestedIndex = (() => {
        if (!days.length) return 0;
        const lastForProgram = [...gymData.history].reverse()
            .find((h) => days.some((d) => d.id === h.dayId));
        if (!lastForProgram) return 0;
        const i = days.findIndex((d) => d.id === lastForProgram.dayId);
        return i === -1 ? 0 : (i + 1) % days.length;
    })();

    // These sit above the empty-state return on purpose. Below it they were
    // skipped whenever there was no active program, so creating the first one
    // changed the hook count between renders and React threw.
    const [dayId, setDayId] = useState<number | null>(days[suggestedIndex]?.id ?? null);
    const [date, setDate] = useState(() => todayKey());

    if (!activeProgram) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 text-[var(--text-muted)] flex items-center justify-center">
                    <Icon name="dumbbell" size={22} />
                </div>
                <p className="text-xl text-gray-300">{t('gym:home.noProgram')}</p>
                <button onClick={() => setView('programs')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">{t('gym:home.createProgram')}</button>
            </div>
        );
    }

    const selectedDay = days.find((d) => d.id === dayId) ?? days[suggestedIndex];
    const today = todayKey();
    const isToday = date === today;
    const isFuture = date > today;

    const begin = () => {
        if (!selectedDay) return;
        // Midday keeps a back-dated session on the intended day in every view.
        startWorkout(selectedDay, instantForDateKey(date));
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm">{t('gym:home.currentProgram')}</p>
                        <h2 className="text-2xl font-bold text-white">{activeProgram.name}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">{t('gym:home.totalWorkouts')}</p>
                        <p className="text-2xl font-bold text-cyan-400">{gymData.history.length}</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                <h3 className="text-xl font-bold mb-4">{t('gym:home.newWorkout')}</h3>

                {days.length === 0 ? (
                    <div className="text-gray-400 text-sm">
                        {t('gym:home.noDays')}{' '}
                        <button onClick={() => setView('programs')} className="text-cyan-400 hover:underline">{t('gym:home.addDays')}</button>
                    </div>
                ) : (
                    <>
                        <fieldset className="mb-5">
                        <legend className="block text-sm text-gray-400 mb-2">{t('gym:home.dayLegend')}</legend>
                        <div className="flex flex-wrap gap-2">
                            {days.map((d: ProgramDay, i: number) => (
                                <button key={d.id} type="button" onClick={() => setDayId(d.id)}
                                    aria-pressed={selectedDay?.id === d.id}
                                    className={`px-4 py-2 rounded-lg text-sm border transition ${
                                        selectedDay?.id === d.id
                                            ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/50 font-bold'
                                            : 'border-[var(--border)] text-gray-400 hover:text-white'
                                    }`}>
                                    {d.name}
                                    <span className="opacity-60 text-xs"> · {d.exercises?.length ?? 0} {t('gym:unit.sets')}</span>
                                    {i === suggestedIndex && selectedDay?.id !== d.id && (
                                        <span className="ml-1.5 text-[10px] text-green-400">{t('gym:home.next')}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                        </fieldset>

                        <label htmlFor="workout-date" className="block text-sm text-gray-400 mb-2">{t('gym:home.dateLabel')}</label>
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <input id="workout-date" type="date" value={date} max={today}
                                onChange={e => setDate(e.target.value)}
                                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400" />
                            {!isToday && (
                                <button onClick={() => setDate(today)} className="text-xs text-cyan-400 hover:underline">
                                    {t('gym:home.backToToday')}
                                </button>
                            )}
                            <span className="text-xs text-gray-500">
                                {isToday ? t('gym:home.today') : t('gym:home.backdated', { date: formatDate(date, 'weekday') })}
                            </span>
                        </div>

                        <button onClick={begin} disabled={!selectedDay || isFuture}
                            className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg disabled:opacity-40">
                            {selectedDay ? t('gym:home.startNamed', { day: selectedDay.name }) : t('gym:home.start')}
                        </button>
                    </>
                )}
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <p className="text-gray-400 text-sm mb-1">{t('gym:home.lastWorkout')}</p>
                <h3 className="text-xl font-bold text-white mb-1">{lastWorkout ? lastWorkout.dayName : t('gym:home.noData')}</h3>
                <p className="text-gray-400 text-sm">
                    {lastWorkout ? formatDate(lastWorkout.date, 'dayMonth') : '—'}
                </p>
            </div>
        </div>
    );
}

export function GymPrograms({ gymData, setGymData }: { gymData: GymData; setGymData: Setter<GymData> }) {
    const { t } = useTranslation('gym');
    const [editingProgram, setEditingProgram] = useState<Program | null>(null);
    const [importing, setImporting] = useState(false);

    const createProgram = () => {
        const newProgram = { id: Date.now(), name: t('gym:programs.newName'), days: [] };
        setGymData({ ...gymData, programs: [...gymData.programs, newProgram], activeProgramId: newProgram.id });
        setEditingProgram(newProgram);
    };

    const deleteProgram = (id: number) => {
        if (confirm(t('gym:programs.confirmDelete'))) {
            const newPrograms = gymData.programs.filter((p) => p.id !== id);
            const newActiveId = gymData.activeProgramId === id ? (newPrograms[0]?.id || null) : gymData.activeProgramId;
            setGymData({ ...gymData, programs: newPrograms, activeProgramId: newActiveId });
        }
    };

    if (editingProgram) {
        const program = gymData.programs.find(p => p.id === editingProgram.id) ?? editingProgram;
        return <ProgramEditor program={program} gymData={gymData} setGymData={setGymData} setEditingProgram={setEditingProgram} />;
    }

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={createProgram} className="bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg">{t('gym:programs.create')}</button>
                <button onClick={() => setImporting(true)}
                    className="px-6 py-3 rounded-lg border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 font-bold transition flex items-center gap-2">
                    <Icon name="download" size={16} />
                    {t('gym:programs.import')}
                </button>
            </div>
            {importing && <ProgramImport gymData={gymData} setGymData={setGymData} onClose={() => setImporting(false)} />}
            <div className="space-y-4">
                {gymData.programs.map((p) => (
                    <div key={p.id} className="glass-card p-6 rounded-2xl flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white">{p.name}</h3>
                            <p className="text-gray-400 text-sm">{t('gym:programs.days', { count: p.days.length })}</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setGymData({ ...gymData, activeProgramId: p.id })} className={`px-4 py-2 rounded-lg text-sm ${gymData.activeProgramId === p.id ? 'bg-green-400/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>{gymData.activeProgramId === p.id ? t('gym:programs.active') : t('gym:programs.makeActive')}</button>
                            <button onClick={() => setEditingProgram(p)} className="px-4 py-2 rounded-lg text-sm bg-purple-400/20 text-purple-400">{t('gym:programs.edit')}</button>
                            <button onClick={() => deleteProgram(p.id)} className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400">{t('gym:programs.delete')}</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ProgramEditor({ program, gymData, setGymData, setEditingProgram }: {
    program: Program;
    gymData: GymData;
    setGymData: Setter<GymData>;
    setEditingProgram: (p: Program | null) => void;
}) {
    const { t } = useTranslation('gym');
    // { dayId, exercise } — an open add/edit form. `exercise` is null when adding.
    const [form, setForm] = useState<{ dayId: number; exercise: ProgramExercise | null; type: ExerciseKind } | null>(null);

    const patchProgram = (patch: Partial<Program>) =>
        setGymData({ ...gymData, programs: gymData.programs.map((p) => p.id === program.id ? { ...p, ...patch } : p) });
    const patchDay = (dayId: number, patch: Partial<ProgramDay>) =>
        patchProgram({ days: program.days.map((d) => d.id === dayId ? { ...d, ...patch } : d) });

    const addDay = () => patchProgram({ days: [...program.days, { id: Date.now(), name: t('gym:programs.dayName', { n: program.days.length + 1 }), exercises: [] }] });
    const deleteDay = (dayId: number) => {
        if (!confirm(t('gym:programs.confirmDeleteDay'))) return;
        patchProgram({ days: program.days.filter((d) => d.id !== dayId) });
    };

    const saveExercise = (dayId: number, ex: ProgramExercise) => {
        // The day can be gone if it was deleted while this form was open.
        const day = program.days.find(d => d.id === dayId);
        if (!day) { setForm(null); return; }
        const exists = day.exercises.some(e => e.id === ex.id);
        patchDay(dayId, {
            exercises: exists
                ? day.exercises.map(e => e.id === ex.id ? ex : e)
                : [...day.exercises, ex],
        });
        setForm(null);
    };
    // By position, not by id: `id` is optional on exercises imported before it
    // was written, and filtering on an undefined id would remove every one of
    // them at once rather than the one that was clicked.
    const deleteExerciseAt = (dayId: number, index: number) => {
        const day = program.days.find(d => d.id === dayId);
        if (!day) return;
        patchDay(dayId, { exercises: day.exercises.filter((_, i) => i !== index) });
    };

    const drag = useDragReorder(program.days, (days: ProgramDay[]) => patchProgram({ days }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <input type="text" value={program.name} onChange={e => patchProgram({ name: e.target.value })} className="bg-transparent text-2xl font-bold text-white border-b border-[var(--border)] outline-none focus:border-cyan-400" />
                <button onClick={() => setEditingProgram(null)} className="text-gray-400 hover:text-white">{t('gym:programs.back')}</button>
            </div>

            {program.days.length > 1 && (
                <p className="text-xs text-[var(--text-muted)] mb-3 flex items-center gap-1.5">
                    <Icon name="grip" size={13} /> {t('gym:programs.dragHint')}
                </p>
            )}

            <div className="space-y-6">
                {program.days.map((day, i) => (
                    <div key={day.id} {...drag.itemProps(i)} className={`glass-card p-6 rounded-2xl ${drag.itemClass(i)}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <span {...drag.handleProps} title={t('gym:programs.dragDay')}
                                className="text-[var(--text-muted)] hover:text-cyan-400 transition shrink-0">
                                <Icon name="grip" size={16} />
                            </span>
                            <input type="text" value={day.name} onChange={e => patchDay(day.id, { name: e.target.value })} className="flex-1 min-w-0 bg-transparent text-xl font-bold text-cyan-400 border-b border-[var(--border)] outline-none focus:border-cyan-400" />
                            <button onClick={() => deleteDay(day.id)} className="text-red-400 text-sm hover:text-red-300 shrink-0">{t('gym:programs.deleteDay')}</button>
                        </div>

                        <div className="space-y-2 mb-4">
                            {day.exercises.map((ex, exIndex) => (
                                <div key={ex.id} className="bg-[var(--bg-input)] p-3 rounded-lg flex items-center gap-3">
                                    <Icon name={isCardio(ex) ? 'activity' : 'dumbbell'} size={16}
                                        className={isCardio(ex) ? 'text-pink-400 shrink-0' : 'text-cyan-400 shrink-0'} />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-white font-medium">{ex.name}</span>{' '}
                                        <span className="text-gray-400 text-sm">({ex.muscle})</span>
                                    </div>
                                    <span className="text-gray-300 text-sm whitespace-nowrap">
                                        {isCardio(ex)
                                            ? `${ex.duration} ${t('gym:unit.min')} · ${intensityLabel(ex.intensity ?? DEFAULT_INTENSITY, t)}`
                                            : `${ex.sets} × ${ex.reps}`}
                                    </span>
                                    <button onClick={() => setForm({ dayId: day.id, exercise: ex, type: ex.type })} title={t('gym:programs.editExercise')}
                                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-purple-400 transition shrink-0">
                                        <Icon name="edit" size={14} />
                                    </button>
                                    <button onClick={() => deleteExerciseAt(day.id, exIndex)} title={t('gym:programs.deleteExercise')}
                                        className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 transition shrink-0">
                                        <Icon name="trash" size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {form && form.dayId === day.id ? (
                            <ExerciseForm
                                initial={form.exercise}
                                defaultType={form.type}
                                onSave={(ex) => saveExercise(day.id, ex)}
                                onCancel={() => setForm(null)}
                            />
                        ) : (
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button onClick={() => setForm({ dayId: day.id, exercise: null, type: 'strength' })}
                                    className="flex-1 flex items-center justify-center gap-2 border border-dashed border-[var(--border)] text-gray-400 py-2 rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition">
                                    <Icon name="dumbbell" size={15} /> {t('gym:programs.addStrength')}
                                </button>
                                <button onClick={() => setForm({ dayId: day.id, exercise: null, type: 'cardio' })}
                                    className="flex-1 flex items-center justify-center gap-2 border border-dashed border-[var(--border)] text-gray-400 py-2 rounded-lg hover:border-pink-400 hover:text-pink-400 transition">
                                    <Icon name="activity" size={15} /> {t('gym:programs.addCardio')}
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button onClick={addDay} className="mt-6 w-full bg-white/5 text-white font-bold py-3 rounded-lg border border-[var(--border)]">{t('gym:programs.addDay')}</button>
        </div>
    );
}

function ExerciseForm({ initial, defaultType, onSave, onCancel }: {
    initial: ProgramExercise | null;
    defaultType: ExerciseKind;
    onSave: (ex: ProgramExercise) => void;
    onCancel: () => void;
}) {
    const { t } = useTranslation('gym');
    const [ex, setEx] = useState<ProgramExercise>(() => initial ?? (defaultType === 'cardio'
        ? { id: Date.now(), type: 'cardio', name: '', muscle: CARDIO_MUSCLE, sets: 1, duration: 20, intensity: DEFAULT_INTENSITY }
        : { id: Date.now(), type: 'strength', name: '', muscle: MUSCLE_IDS[0], sets: 4, reps: '8-12' }));

    const cardio = isCardio(ex);
    const patch = (p: Partial<ProgramExercise>) => setEx({ ...ex, ...p });
    const save = () => { if (ex.name.trim()) onSave({ ...ex, name: ex.name.trim() }); };
    const field = 'bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-400';

    return (
        <div className={`p-4 rounded-xl border ${cardio ? 'border-pink-400/30 bg-pink-400/5' : 'border-cyan-400/30 bg-cyan-400/5'}`}>
            <div className="flex items-center gap-2 mb-3 text-sm font-bold">
                <Icon name={cardio ? 'activity' : 'dumbbell'} size={16} className={cardio ? 'text-pink-400' : 'text-cyan-400'} />
                {initial ? t('gym:exercise.editHeading') : cardio ? t('gym:exercise.newCardio') : t('gym:exercise.newStrength')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <input autoFocus value={ex.name} onChange={e => patch({ name: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && save()}
                    placeholder={cardio ? t('gym:exercise.cardioPlaceholder') : t('gym:exercise.strengthPlaceholder')} className={`${field} sm:col-span-2`} />

                {cardio ? (
                    <>
                        <label className="flex items-center gap-2 text-sm text-gray-400">
                            {t('gym:exercise.minutes')}
                            <input type="number" min={1} value={ex.duration}
                                onChange={e => patch({ duration: parseInt(e.target.value) || 0 })} className={`${field} w-24`} />
                        </label>
                        <select value={ex.intensity} onChange={e => patch({ intensity: e.target.value })} className={field}>
                            {INTENSITY_IDS.map(v => <option key={v} value={v}>{intensityLabel(v, t)}</option>)}
                        </select>
                    </>
                ) : (
                    <>
                        <select value={ex.muscle} onChange={e => patch({ muscle: e.target.value })} className={field}>
                            {[...new Set([ex.muscle, ...MUSCLE_IDS])].map(m => <option key={m} value={m}>{muscleLabel(m, t)}</option>)}
                        </select>
                        <div className="flex gap-2">
                            <label className="flex items-center gap-2 text-sm text-gray-400">
                                {t('gym:exercise.sets')}
                                <input type="number" min={1} max={12} value={ex.sets}
                                    onChange={e => patch({ sets: parseInt(e.target.value) || 1 })} className={`${field} w-20`} />
                            </label>
                            <input value={ex.reps} onChange={e => patch({ reps: e.target.value })}
                                placeholder="8-12" className={`${field} flex-1 min-w-0`} />
                        </div>
                    </>
                )}
            </div>

            <div className="flex gap-2">
                <button onClick={save} disabled={!ex.name.trim()}
                    className="bg-cyan-400 text-black font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-40">{t('gym:exercise.save')}</button>
                <button onClick={onCancel} className="px-5 py-2 rounded-lg text-sm border border-[var(--border)] text-gray-400 hover:text-white">{t('gym:exercise.cancel')}</button>
            </div>
        </div>
    );
}

export function ActiveWorkoutView({ activeWorkout, setActiveWorkout, finishWorkout, isEditing }: {
    activeWorkout: Workout;
    setActiveWorkout: Setter<Workout | null>;
    /** Live sessions take no argument; editing an old one passes the edited workout. */
    finishWorkout: (workout?: Workout) => void;
    isEditing?: boolean;
}) {
    const { t } = useTranslation('gym');
    const [activeExIdx, setActiveExIdx] = useState(0);
    const exercise = activeWorkout.exercises[activeExIdx];

    const updateSet = <K extends keyof WorkoutSet>(setIdx: number, field: K, value: WorkoutSet[K]) => {
        const newExercises = [...activeWorkout.exercises];
        const set = newExercises[activeExIdx]?.sets[setIdx];
        if (!set) return;
        set[field] = value;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const toggleDone = (setIdx: number) => {
        const newExercises = [...activeWorkout.exercises];
        const set = newExercises[activeExIdx]?.sets[setIdx];
        if (!set) return;
        set.done = !set.done;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const changeWeight = (setIdx: number, delta: number) => {
        const newExercises = [...activeWorkout.exercises];
        const set = newExercises[activeExIdx]?.sets[setIdx];
        if (!set) return;
        set.weight = parseFloat(((set.weight ?? 0) + delta).toFixed(2));
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    // A programmed set count is a plan, not a limit — an extra set should be
    // recordable without editing the program.
    const addSet = () => {
        const newExercises = [...activeWorkout.exercises];
        const current = newExercises[activeExIdx];
        if (!current) return;
        const last = current.sets[current.sets.length - 1];
        current.sets.push({ weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false });
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const removeSet = (setIdx: number) => {
        const newExercises = [...activeWorkout.exercises];
        const current = newExercises[activeExIdx];
        if (!current) return;
        current.sets = current.sets.filter((_, i) => i !== setIdx);
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    // Cardio is a single entry rather than a list of sets.
    const updateCardio = (patch: Partial<WorkoutSet>) => {
        const newExercises = [...activeWorkout.exercises];
        const current = newExercises[activeExIdx];
        if (!current) return;
        const existing: WorkoutSet = current.sets[0] ?? { done: false };
        newExercises[activeExIdx] = { ...current, sets: [{ ...existing, ...patch }] };
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };
    const cardioSet: WorkoutSet = exercise?.sets[0] ?? { done: false };

    // A session can only be empty if its program day had no exercises; there is
    // nothing to log, so say so rather than rendering a broken form.
    if (!exercise) {
        return <GymEmptyState icon="dumbbell" text={t('gym:session.empty')} />;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{activeWorkout.dayName} {isEditing && <span className="text-purple-400 text-sm">{t('gym:session.editing')}</span>}</h1>
                    <p className="text-gray-400 text-sm">{new Date(activeWorkout.date).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex gap-2">
                    {isEditing && <button onClick={() => finishWorkout(activeWorkout)} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg">{t('gym:session.cancel')}</button>}
                    <button onClick={() => finishWorkout(activeWorkout)} className="bg-green-400 text-black font-bold px-6 py-3 rounded-lg">{isEditing ? t('gym:session.save') : t('gym:session.finish')}</button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {activeWorkout.exercises.map((ex, i) => (
                    <button key={i} onClick={() => setActiveExIdx(i)} className={`px-4 py-2 rounded-lg whitespace-nowrap transition flex items-center gap-2 ${i === activeExIdx ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400'}`}>
                        {isCardio(ex) && <Icon name="activity" size={14} />}
                        {ex.name}
                    </button>
                ))}
            </div>

            {isCardio(exercise) ? (
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-pink-400 mb-4 flex items-center gap-2">
                    <Icon name="activity" size={18} /> {exercise.name}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <label className="block">
                        <span className="text-xs text-gray-400">{t('gym:session.duration')}</span>
                        <input type="number" min={0} value={cardioSet.duration ?? 0}
                            onChange={e => updateCardio({ duration: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 text-center text-white outline-none focus:border-pink-400" />
                    </label>
                    <label className="block">
                        <span className="text-xs text-gray-400">{t('gym:session.distance')}</span>
                        <input type="number" min={0} step="0.1" value={cardioSet.distance ?? 0}
                            onChange={e => updateCardio({ distance: parseFloat(e.target.value) || 0 })}
                            className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 text-center text-white outline-none focus:border-pink-400" />
                    </label>
                    <label className="block">
                        <span className="text-xs text-gray-400">{t('gym:session.intensity')}</span>
                        <select value={cardioSet.intensity ?? DEFAULT_INTENSITY}
                            onChange={e => updateCardio({ intensity: e.target.value })}
                            className="w-full mt-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-2.5 text-white outline-none focus:border-pink-400">
                            {INTENSITY_IDS.map(v => <option key={v} value={v}>{intensityLabel(v, t)}</option>)}
                        </select>
                    </label>
                </div>

                <button onClick={() => updateCardio({ done: !cardioSet.done })}
                    className={`mt-4 w-full py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
                        cardioSet.done ? 'bg-green-400 text-black' : 'bg-white/5 text-gray-400 border border-[var(--border)]'
                    }`}>
                    <Icon name="check" size={16} /> {cardioSet.done ? t('gym:session.done') : t('gym:session.markDone')}
                </button>
            </div>
            ) : (
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-cyan-400 mb-4">{exercise.name} <span className="text-gray-400 text-sm">({exercise.muscle})</span></h2>

                <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2 px-2">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4 text-center">{t('gym:session.weight')}</div>
                    <div className="col-span-3 text-center">{t('gym:session.reps')}</div>
                    <div className="col-span-2 text-center">{t('gym:session.doneShort')}</div>
                    <div className="col-span-2"></div>
                </div>

                <div className="space-y-3">
                    {exercise.sets.map((set, idx) => (
                        <div key={idx} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${set.done ? 'bg-green-500/10' : 'bg-[var(--bg-input)]'}`}>
                            <div className="col-span-1 text-center text-gray-400">{idx + 1}</div>
                            <div className="col-span-4 flex items-center gap-1">
                                <button onClick={() => changeWeight(idx, -2.5)} className="bg-red-500/20 text-red-400 w-8 h-8 rounded-md font-bold">-</button>
                                <input type="number" value={set.weight} onChange={e => updateSet(idx, 'weight', parseFloat(e.target.value) || 0)} className="w-full bg-transparent border border-[var(--border)] rounded-md p-2 text-center text-white" />
                                <button onClick={() => changeWeight(idx, 2.5)} className="bg-green-500/20 text-green-400 w-8 h-8 rounded-md font-bold">+</button>
                            </div>
                            <div className="col-span-3">
                                <input type="number" value={set.reps} onChange={e => updateSet(idx, 'reps', parseInt(e.target.value) || 0)} className="w-full bg-transparent border border-[var(--border)] rounded-md p-2 text-center text-white" />
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <button onClick={() => toggleDone(idx)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition ${set.done ? 'bg-green-400 border-green-400 text-black' : 'border-gray-500 text-transparent'}`}>
                                    <Icon name="check" size={16} />
                                </button>
                            </div>
                            <div className="col-span-2 flex justify-center">
                                <button onClick={() => removeSet(idx)} disabled={exercise.sets.length <= 1}
                                    title={exercise.sets.length <= 1 ? t('gym:session.lastSet') : t('gym:session.removeSet')}
                                    className="text-gray-600 hover:text-red-400 disabled:opacity-20 disabled:hover:text-gray-600 px-2">
                                    <Icon name="close" size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={addSet}
                    className="mt-3 w-full py-2.5 rounded-lg border border-dashed border-[var(--border)] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 transition text-sm">
                    {t('gym:session.addSet')}
                </button>
            </div>
            )}

            <div className="flex justify-between mt-6">
                <button onClick={() => setActiveExIdx(Math.max(0, activeExIdx - 1))} disabled={activeExIdx === 0} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">{t('gym:session.prev')}</button>
                <button onClick={() => setActiveExIdx(Math.min(activeWorkout.exercises.length - 1, activeExIdx + 1))} disabled={activeExIdx === activeWorkout.exercises.length - 1} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">{t('gym:session.next')}</button>
            </div>
        </div>
    );
}

export function GymHistory({ gymData, setGymData, setEditingWorkout }: {
    gymData: GymData;
    setGymData: Setter<GymData>;
    setEditingWorkout: (w: Workout | null) => void;
}) {
    const { t } = useTranslation('gym');
    if (gymData.history.length === 0) return <GymEmptyState icon="clock" text={t('gym:history.empty')} />;

    const reversedHistory = [...gymData.history].reverse();

    const calcStats = (workout: Workout) => {
        let totalSets = 0, totalReps = 0, totalTonnage = 0, cardioMin = 0, cardioKm = 0;
        workout.exercises.forEach((ex) => {
            ex.sets.forEach((s) => {
                if (!s.done) return;
                if (isCardio(ex)) {
                    cardioMin += num(s.duration);
                    cardioKm += num(s.distance);
                    return;
                }
                totalSets++;
                const w = num(s.weight);
                const r = num(s.reps);
                totalReps += r;
                totalTonnage += w * r;
            });
        });
        const duration = workout.endTime ? (workout.endTime - workout.startTime) / 60000 : 0;
        return {
            totalSets, totalReps, totalTonnage: Math.round(totalTonnage),
            cardioMin: Math.round(cardioMin), cardioKm: Math.round(cardioKm * 10) / 10,
            duration: Math.round(duration),
        };
    };

    const deleteWorkout = (workout: Workout) => {
        const id = workout.id || workout.date;
        setGymData({ ...gymData, history: gymData.history.filter((w) => (w.id || w.date) !== id) });
    };

    return (
        <div className="space-y-4">
            {reversedHistory.map((w) => {
                const stats = calcStats(w);
                const tiles = [
                    { value: stats.totalTonnage, label: t('gym:history.tonnage') },
                    { value: stats.totalSets, label: t('gym:history.sets') },
                    { value: stats.totalReps, label: t('gym:history.reps') },
                    ...(stats.cardioMin ? [{ value: stats.cardioMin, label: t('gym:history.cardioMin') }] : []),
                    ...(stats.cardioKm ? [{ value: stats.cardioKm, label: t('gym:history.cardioKm') }] : []),
                ];
                return (
                    <div key={w.id || w.date} className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{w.dayName}</h3>
                                <p className="text-gray-400 text-sm">{new Date(w.date).toLocaleString('ru-RU')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-cyan-400 font-bold">{t('gym:history.durationMin', { count: stats.duration })}</div>
                                <button onClick={() => setEditingWorkout(w)} className="text-purple-400 text-sm hover:underline">{t('gym:history.edit')}</button>
                                <button onClick={() => deleteWorkout(w)} className="text-red-400 text-sm hover:underline">{t('gym:history.delete')}</button>
                            </div>
                        </div>
                        <div className={`grid gap-4 text-center mb-4 ${tiles.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
                            {tiles.map(t => (
                                <div key={t.label} className="bg-[var(--bg-input)] p-3 rounded-lg">
                                    <div className="text-xl font-bold text-white">{t.value}</div>
                                    <div className="text-xs text-gray-400">{t.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                            {w.exercises.map((ex, i) => (
                                <div key={i} className="flex justify-between text-sm gap-3">
                                    <span className="text-gray-300 flex items-center gap-1.5">
                                        {isCardio(ex) && <Icon name="activity" size={13} className="text-pink-400" />}
                                        {ex.name}
                                    </span>
                                    <span className="text-gray-500 text-right">
                                        {ex.sets.filter((s) => s.done).map((s) =>
                                            isCardio(ex)
                                                ? `${s.duration} ${t('gym:unit.min')}${s.distance ? ` · ${s.distance} ${t('gym:unit.km')}` : ''}`
                                                : `${s.weight}×${s.reps}`
                                        ).join(', ')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function GymPRs({ gymData }: { gymData: GymData }) {
    const { t } = useTranslation('gym');
    const [filter, setFilter] = useState<string>(ALL_FILTER);
    
    // Personal bests, grouped muscle -> exercise, built up as the history is walked.
    const db: Record<string, Record<string, { maxWeight: number; max1RM: number; maxReps: number }>> = {};
    const cardioDb: Record<string, { maxDuration: number; maxDistance: number; totalMin: number }> = {};
    gymData.history.forEach((w) => {
        w.exercises.forEach((ex) => {
            if (isCardio(ex)) {
                const rec = (cardioDb[ex.name] ??= { maxDuration: 0, maxDistance: 0, totalMin: 0 });
                ex.sets.forEach(s => {
                    const d = num(s.duration);
                    const km = num(s.distance);
                    if (d > rec.maxDuration) rec.maxDuration = d;
                    if (km > rec.maxDistance) rec.maxDistance = km;
                    rec.totalMin += d;
                });
                return;
            }

            const byExercise = (db[ex.muscle] ??= {});
            const rec = (byExercise[ex.name] ??= { maxWeight: 0, max1RM: 0, maxReps: 0 });

            ex.sets.forEach(s => {
                const w = num(s.weight);
                const r = num(s.reps);
                if (w > rec.maxWeight) rec.maxWeight = w;
                if (r > rec.maxReps) rec.maxReps = r;
                // Epley: an estimated one-rep max, so sets at different rep
                // counts stay comparable.
                const e1RM = w * (1 + r / 30);
                if (e1RM > rec.max1RM) rec.max1RM = e1RM;
            });
        });
    });

    const cardioNames = Object.keys(cardioDb);
    const muscles = [ALL_FILTER, ...Object.keys(db), ...(cardioNames.length ? [CARDIO_MUSCLE] : [])];
    if (muscles.length === 1) return <GymEmptyState icon="trophy" text={t('gym:records.empty')} />;

    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">{t('gym:records.heading')}</h2>

            <div className="flex gap-2 mb-6 flex-wrap">
                {muscles.map(m => (
                    <button key={m} onClick={() => setFilter(m)} className={`px-4 py-1 rounded-full text-sm transition ${filter === m ? 'bg-purple-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {m}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(filter === ALL_FILTER || filter === CARDIO_MUSCLE) && Object.entries(cardioDb).map(([name, pr]) => {
                    return (
                        <div key={'cardio-' + name} className="glass-card p-6 rounded-2xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-pink-400/10 text-pink-400 flex items-center justify-center shrink-0">
                                <Icon name="activity" size={22} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-white">{name}</h3>
                                <p className="text-xs text-gray-500 mb-2">{t('gym:records.cardio')}</p>
                                <div className="flex flex-wrap gap-4 text-sm">
                                    <span className="text-gray-300">{t('gym:records.longest')}<span className="text-cyan-400 font-bold">{pr.maxDuration} {t('gym:unit.min')}</span></span>
                                    {pr.maxDistance > 0 && <span className="text-gray-300">{t('gym:records.maxDistance')}<span className="text-purple-400 font-bold">{pr.maxDistance} {t('gym:unit.km')}</span></span>}
                                    <span className="text-gray-300">{t('gym:records.total')}<span className="text-green-400 font-bold">{Math.round(pr.totalMin)} {t('gym:unit.min')}</span></span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {Object.entries(db).map(([muscle, byExercise]) => {
                    if (filter !== ALL_FILTER && filter !== muscle) return null;
                    return Object.entries(byExercise).map(([name, pr]) => {
                        return (
                            <div key={muscle + name} className="glass-card p-6 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
                                    <Icon name="trophy" size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{muscle}</p>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-gray-300">{t('gym:records.maxWeight')}<span className="text-cyan-400 font-bold">{pr.maxWeight} {t('gym:unit.kg')}</span></span>
                                        <span className="text-gray-300">{t('gym:records.oneRepMax')}<span className="text-purple-400 font-bold">{formatNumber(pr.max1RM, 1)} {t('gym:unit.kg')}</span></span>
                                        <span className="text-gray-300">{t('gym:records.maxReps')}<span className="text-green-400 font-bold">{pr.maxReps}</span></span>
                                    </div>
                                </div>
                            </div>
                        );
                    });
                })}
            </div>
        </div>
    );
}

// The coach's system prompt lives in the locale files rather than here.
//
// It is not UI text, so it does not belong there on principle — but it is a
// string that must exist once per language, and the alternative was one English
// prompt asking the model to reply in the user's language. That would have
// changed the answers every existing Russian user gets, from a prompt that has
// been tuned against real output, to fix a problem they do not have.

/** One exercise's recent history, as handed to the model for its recommendation. */
type GymContextItem = {
    exercise: string;
    type: 'cardio' | 'strength';
    targetReps?: number | null;
    targetDurationMin?: number | null;
    last: ExerciseSnapshot;
    previous: ExerciseSnapshot | null;
};

type ExerciseSnapshot = {
    /** Calendar date; the instant's time is dropped before it reaches the model. */
    date: string | undefined;
    /**
     * Cardio and strength sets carry different fields. Both shapes are allowed
     * here rather than split into two snapshot types, because the model reads
     * this as JSON and only ever sees the keys that are present.
     */
    sets: Array<Record<string, number | string | undefined>>;
    sleep: number | null;
};

function buildGymContext(activeProgram: Program | undefined, gymData: GymData, logs: DayLog[]): GymContextItem[] {
    // Nothing to advise on until a program is active.
    if (!activeProgram) return [];
    const planned = new Map<string, ProgramExercise>();
    activeProgram.days.forEach(d => d.exercises.forEach(e => planned.set(e.name, e)));

    const getHistory = (name: string) =>
        gymData.history
            .filter((w) => w.exercises.some((e) => e.name === name))
            .map((w) => ({
                date: w.date,
                sets: w.exercises.find(e => e.name === name)?.sets.filter(s => s.done) ?? [],
            }));

    const getDayLog = (dateStr: string) =>
        logs.find((l) => l.date.split('T')[0] === dateStr.split('T')[0]);

    const items: GymContextItem[] = [];
    planned.forEach((plan, name) => {
        const history = getHistory(name);
        const last = history[history.length - 1];
        if (!last || last.sets.length === 0) return;

        const cardio = isCardio(plan);
        const repRange = String(plan.reps ?? '').split('-');
        // Aim for the top of the range ("8-12" -> 12), falling back to the
        // single value when the range has no upper bound.
        const targetReps = cardio ? null : (parseInt(repRange[1] ?? repRange[0] ?? '') || 10);

        const summarize = (entry: { date: string; sets: WorkoutSet[] }) => ({
            date: entry.date.split('T')[0],
            sets: entry.sets.map((s) => cardio
                ? { durationMin: s.duration, distanceKm: s.distance, intensity: s.intensity }
                : { weight: s.weight, reps: s.reps }),
            sleep: getDayLog(entry.date)?.sleep ?? null,
        });

        const prev = history[history.length - 2] ?? null;

        items.push({
            exercise: name,
            type: cardio ? 'cardio' : 'strength',
            ...(cardio ? { targetDurationMin: plan.duration ?? null } : { targetReps }),
            last: summarize(last),
            previous: prev && prev.sets.length ? summarize(prev) : null,
        });
    });
    return items;
}

export function GymAI({ gymData, logs }: { gymData: GymData; logs: DayLog[] }) {
    const { t } = useTranslation('gym');
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const activeProgram = gymData.programs.find((p) => p.id === gymData.activeProgramId);
    if (!activeProgram) return <GymEmptyState icon="sparkle" text={t('gym:coach.noProgram')} />;

    const context = buildGymContext(activeProgram, gymData, logs);
    if (context.length === 0) return <GymEmptyState icon="sparkle" text={t('gym:coach.noData')} />;

    const askCoach = async () => {
        setLoading(true);
        setError('');
        setOutput('');
        try {
            await streamAI({
                system: t('gym:coach.system'),
                maxTokens: 1200,
                messages: [{
                    role: 'user',
                    content: t('gym:coach.userPrompt', { json: JSON.stringify(context, null, 2) }),
                }],
                onToken: (chunk) => setOutput((prev) => prev + chunk),
                t,
            });
        } catch (e) {
            setError(errorMessage(e, t('gym:coach.failed')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="glass-card p-6 rounded-2xl flex flex-col md:flex-row md:items-center gap-4 bg-cyan-400/5 border border-cyan-400/30">
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-cyan-400 mb-1 flex items-center gap-2">
                        <Icon name="sparkle" size={18} />
                        {t('gym:coach.heading')}
                    </h3>
                    <p className="text-sm text-gray-400">{t('gym:coach.blurb')}</p>
                </div>
                <button
                    onClick={askCoach}
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap"
                >
                    {loading ? t('gym:coach.thinking') : output ? t('gym:coach.refresh') : t('gym:coach.analyse')}
                </button>
            </div>

            {error && (
                <div className="glass-card p-4 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>
            )}

            {(output || loading) && (
                <div className="glass-card p-6 rounded-2xl">
                    {output
                        ? <div className="text-gray-200 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(output, { breaks: true, async: false }) as string }} />
                        : <div className="text-gray-500 text-sm animate-pulse">{t('gym:coach.analysing')}</div>}
                </div>
            )}
        </div>
    );
}
