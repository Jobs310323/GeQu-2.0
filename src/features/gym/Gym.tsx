import { useState } from 'react';
import { streamAI } from '../../lib/ai';
import { ProgramImport } from './ProgramImport';
import { marked } from 'marked';
import { PageHeader } from '../../components/PageHeader';
import { Icon } from '../../components/Icons';

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

export function GymApp({ gymData, setGymData, logs }: any) {
    const [view, setView] = useState('home');
    const [activeWorkout, setActiveWorkout] = useState<any>(null);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);

    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);

    const startWorkout = (day: any, dateISO?: string) => {
        const lastHistory = [...gymData.history].reverse().find((h: any) => h.dayId === day.id);
        const exercises = day.exercises.map((ex: any) => {
            const lastEx = lastHistory?.exercises.find((e: any) => e.name === ex.name);
            const sets = Array.from({ length: ex.sets }).map((_, i) => ({
                weight: parseFloat(lastEx?.sets[i]?.weight) || 0,
                reps: parseInt(lastEx?.sets[i]?.reps) || parseInt(ex.reps.split('-')[0]) || 0,
                done: false
            }));
            return { name: ex.name, muscle: ex.muscle, sets };
        });

        setActiveWorkout({
            id: Date.now(),
            dayId: day.id,
            dayName: day.name,
            // Back-dated sessions keep the chosen day but a midday timestamp,
            // so they land on the right day in every local-time view.
            date: dateISO ?? new Date().toISOString(),
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

    const saveEditedWorkout = (updated: any) => {
        const newHistory = gymData.history.map((w: any) => 
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
        { id: 'home', label: 'Главная' },
        { id: 'programs', label: 'Программы' },
        { id: 'history', label: 'История' },
        { id: 'pr', label: 'Рекорды' },
        { id: 'ai', label: 'ИИ-Тренер' },
    ];

    return (
        <div>
            <PageHeader page="gym" title="Спортзал" />
            <div className="glass-card rounded-xl p-1.5 mb-6 flex gap-1 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setView(t.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm transition ${view === t.id ? 'text-cyan-400 bg-cyan-400/10 font-medium' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-[var(--text-main)]'}`}>{t.label}</button>
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

export function GymHome({ activeProgram, gymData, startWorkout, setView }: any) {
    if (!activeProgram) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 text-[var(--text-muted)] flex items-center justify-center">
                    <Icon name="dumbbell" size={22} />
                </div>
                <p className="text-xl text-gray-300">У вас нет активной программы.</p>
                <button onClick={() => setView('programs')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Создать программу</button>
            </div>
        );
    }

    const lastWorkout = gymData.history[gymData.history.length - 1];
    const days = activeProgram.days ?? [];

    // Suggest the day that follows the last one performed, rather than always
    // the first — that matches how a split is actually run.
    const suggestedIndex = (() => {
        if (!days.length) return 0;
        const lastForProgram = [...gymData.history].reverse()
            .find((h: any) => days.some((d: any) => d.id === h.dayId));
        if (!lastForProgram) return 0;
        const i = days.findIndex((d: any) => d.id === lastForProgram.dayId);
        return i === -1 ? 0 : (i + 1) % days.length;
    })();

    const [dayId, setDayId] = useState<number | null>(days[suggestedIndex]?.id ?? null);
    const [date, setDate] = useState(() => new Date().toLocaleDateString('sv-SE')); // local YYYY-MM-DD

    const selectedDay = days.find((d: any) => d.id === dayId) ?? days[suggestedIndex];
    const todayKey = new Date().toLocaleDateString('sv-SE');
    const isToday = date === todayKey;
    const isFuture = date > todayKey;

    const begin = () => {
        if (!selectedDay) return;
        // Midday keeps a back-dated session on the intended day in every view.
        const iso = isToday ? new Date().toISOString() : new Date(`${date}T12:00:00`).toISOString();
        startWorkout(selectedDay, iso);
    };

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-gray-400 text-sm">Текущая программа</p>
                        <h2 className="text-2xl font-bold text-white">{activeProgram.name}</h2>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">Всего тренировок</p>
                        <p className="text-2xl font-bold text-cyan-400">{gymData.history.length}</p>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                <h3 className="text-xl font-bold mb-4">Новая тренировка</h3>

                {days.length === 0 ? (
                    <div className="text-gray-400 text-sm">
                        В программе пока нет дней.{' '}
                        <button onClick={() => setView('programs')} className="text-cyan-400 hover:underline">Добавить их</button>
                    </div>
                ) : (
                    <>
                        <label className="block text-sm text-gray-400 mb-2">День программы</label>
                        <div className="flex flex-wrap gap-2 mb-5">
                            {days.map((d: any, i: number) => (
                                <button key={d.id} onClick={() => setDayId(d.id)}
                                    className={`px-4 py-2 rounded-lg text-sm border transition ${
                                        selectedDay?.id === d.id
                                            ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/50 font-bold'
                                            : 'border-[var(--border)] text-gray-400 hover:text-white'
                                    }`}>
                                    {d.name}
                                    <span className="opacity-60 text-xs"> · {d.exercises?.length ?? 0} упр.</span>
                                    {i === suggestedIndex && selectedDay?.id !== d.id && (
                                        <span className="ml-1.5 text-[10px] text-green-400">след.</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <label className="block text-sm text-gray-400 mb-2">Дата тренировки</label>
                        <div className="flex flex-wrap items-center gap-3 mb-5">
                            <input type="date" value={date} max={todayKey}
                                onChange={e => setDate(e.target.value)}
                                className="bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400" />
                            {!isToday && (
                                <button onClick={() => setDate(todayKey)} className="text-xs text-cyan-400 hover:underline">
                                    Вернуть сегодня
                                </button>
                            )}
                            <span className="text-xs text-gray-500">
                                {isToday ? 'Сегодня' : `Запись задним числом · ${new Date(date + 'T12:00:00').toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                            </span>
                        </div>

                        <button onClick={begin} disabled={!selectedDay || isFuture}
                            className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg disabled:opacity-40">
                            Начать тренировку{selectedDay ? ` · ${selectedDay.name}` : ''}
                        </button>
                    </>
                )}
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <p className="text-gray-400 text-sm mb-1">Последняя тренировка</p>
                <h3 className="text-xl font-bold text-white mb-1">{lastWorkout ? lastWorkout.dayName : 'Нет данных'}</h3>
                <p className="text-gray-400 text-sm">
                    {lastWorkout ? new Date(lastWorkout.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : '—'}
                </p>
            </div>
        </div>
    );
}

export function GymPrograms({ gymData, setGymData }: any) {
    const [editingProgram, setEditingProgram] = useState<any>(null);
    const [importing, setImporting] = useState(false);

    const createProgram = () => {
        const newProgram = { id: Date.now(), name: "Новая программа", days: [] };
        setGymData({ ...gymData, programs: [...gymData.programs, newProgram], activeProgramId: newProgram.id });
        setEditingProgram(newProgram);
    };

    const deleteProgram = (id: number) => {
        if (confirm("Удалить программу навсегда?")) {
            const newPrograms = gymData.programs.filter((p: any) => p.id !== id);
            const newActiveId = gymData.activeProgramId === id ? (newPrograms[0]?.id || null) : gymData.activeProgramId;
            setGymData({ ...gymData, programs: newPrograms, activeProgramId: newActiveId });
        }
    };

    if (editingProgram) {
        const program = gymData.programs.find((p: any) => p.id === editingProgram.id);
        return <ProgramEditor program={program} gymData={gymData} setGymData={setGymData} setEditingProgram={setEditingProgram} />;
    }

    return (
        <div>
            <div className="flex flex-wrap gap-3 mb-6">
                <button onClick={createProgram} className="bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg">+ Создать программу</button>
                <button onClick={() => setImporting(true)}
                    className="px-6 py-3 rounded-lg border border-purple-400/40 text-purple-400 hover:bg-purple-400/10 font-bold transition flex items-center gap-2">
                    <Icon name="download" size={16} />
                    Импорт из текста
                </button>
            </div>
            {importing && <ProgramImport gymData={gymData} setGymData={setGymData} onClose={() => setImporting(false)} />}
            <div className="space-y-4">
                {gymData.programs.map((p: any) => (
                    <div key={p.id} className="glass-card p-6 rounded-2xl flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-bold text-white">{p.name}</h3>
                            <p className="text-gray-400 text-sm">{p.days.length} дней</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setGymData({ ...gymData, activeProgramId: p.id })} className={`px-4 py-2 rounded-lg text-sm ${gymData.activeProgramId === p.id ? 'bg-green-400/20 text-green-400' : 'bg-white/5 text-gray-400'}`}>{gymData.activeProgramId === p.id ? 'Активна' : 'Сделать активной'}</button>
                            <button onClick={() => setEditingProgram(p)} className="px-4 py-2 rounded-lg text-sm bg-purple-400/20 text-purple-400">Ред.</button>
                            <button onClick={() => deleteProgram(p.id)} className="px-4 py-2 rounded-lg text-sm bg-red-500/20 text-red-400">Удалить</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ProgramEditor({ program, gymData, setGymData, setEditingProgram }: any) {
    const addDay = () => {
        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: [...p.days, { id: Date.now(), name: "День " + (p.days.length + 1), exercises: [] }] } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    const addExercise = (dayId: number) => {
        const exName = prompt("Название упражнения:");
        if (!exName) return;
        const muscle = prompt("Мышечная группа (Грудь, Спина, Ноги):") || "—";
        const sets = parseInt(prompt("Кол-во подходов:", "4") || "4") || 4;
        const reps = prompt("Диапазон повторений:", "8-12") || "8-12";

        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: p.days.map((d: any) => d.id === dayId ? { ...d, exercises: [...d.exercises, { id: Date.now(), name: exName, muscle, sets, reps }] } : d) } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    const deleteDay = (dayId: number) => {
        const updatedPrograms = gymData.programs.map((p: any) => 
            p.id === program.id ? { ...p, days: p.days.filter((d: any) => d.id !== dayId) } : p
        );
        setGymData({ ...gymData, programs: updatedPrograms });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <input type="text" value={program.name} onChange={e => setGymData({ ...gymData, programs: gymData.programs.map((p:any) => p.id === program.id ? {...p, name: e.target.value} : p) })} className="bg-transparent text-2xl font-bold text-white border-b border-[var(--border)] outline-none focus:border-cyan-400" />
                <button onClick={() => setEditingProgram(null)} className="text-gray-400 hover:text-white">← Назад</button>
            </div>

            <div className="space-y-6">
                {program.days.map((day: any) => (
                    <div key={day.id} className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <input type="text" value={day.name} onChange={e => setGymData({ ...gymData, programs: gymData.programs.map((p:any) => p.id === program.id ? {...p, days: p.days.map((d:any) => d.id === day.id ? {...d, name: e.target.value} : d)} : p) })} className="bg-transparent text-xl font-bold text-cyan-400 border-b border-[var(--border)] outline-none" />
                            <button onClick={() => deleteDay(day.id)} className="text-red-400 text-sm">Удалить день</button>
                        </div>
                        <div className="space-y-2 mb-4">
                            {day.exercises.map((ex: any) => (
                                <div key={ex.id} className="bg-[var(--bg-input)] p-3 rounded-lg flex justify-between items-center">
                                    <div><span className="text-white font-medium">{ex.name}</span> <span className="text-gray-400 text-sm">({ex.muscle})</span></div>
                                    <span className="text-gray-300 text-sm">{ex.sets} × {ex.reps}</span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => addExercise(day.id)} className="w-full border border-dashed border-[var(--border)] text-gray-400 py-2 rounded-lg hover:border-cyan-400 hover:text-cyan-400 transition">+ Упражнение</button>
                    </div>
                ))}
            </div>
            <button onClick={addDay} className="mt-6 w-full bg-white/5 text-white font-bold py-3 rounded-lg border border-[var(--border)]">+ Добавить день</button>
        </div>
    );
}

export function ActiveWorkoutView({ activeWorkout, setActiveWorkout, finishWorkout, isEditing }: any) {
    const [activeExIdx, setActiveExIdx] = useState(0);
    const exercise = activeWorkout.exercises[activeExIdx];

    const updateSet = (setIdx: number, field: string, value: any) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx][field] = value;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const toggleDone = (setIdx: number) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx].done = !newExercises[activeExIdx].sets[setIdx].done;
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const changeWeight = (setIdx: number, delta: number) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets[setIdx].weight = parseFloat((newExercises[activeExIdx].sets[setIdx].weight + delta).toFixed(2));
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    // A programmed set count is a plan, not a limit — an extra set should be
    // recordable without editing the program.
    const addSet = () => {
        const newExercises = [...activeWorkout.exercises];
        const sets = newExercises[activeExIdx].sets;
        const last = sets[sets.length - 1];
        sets.push({ weight: last?.weight ?? 0, reps: last?.reps ?? 0, done: false });
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    const removeSet = (setIdx: number) => {
        const newExercises = [...activeWorkout.exercises];
        newExercises[activeExIdx].sets = newExercises[activeExIdx].sets.filter((_: any, i: number) => i !== setIdx);
        setActiveWorkout({ ...activeWorkout, exercises: newExercises });
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">{activeWorkout.dayName} {isEditing && <span className="text-purple-400 text-sm">(Редактирование)</span>}</h1>
                    <p className="text-gray-400 text-sm">{new Date(activeWorkout.date).toLocaleDateString('ru-RU')}</p>
                </div>
                <div className="flex gap-2">
                    {isEditing && <button onClick={() => finishWorkout(activeWorkout)} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg">Отмена</button>}
                    <button onClick={() => finishWorkout(activeWorkout)} className="bg-green-400 text-black font-bold px-6 py-3 rounded-lg">{isEditing ? "Сохранить" : "Завершить"}</button>
                </div>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {activeWorkout.exercises.map((ex: any, i: number) => (
                    <button key={i} onClick={() => setActiveExIdx(i)} className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${i === activeExIdx ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400'}`}>
                        {ex.name}
                    </button>
                ))}
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-cyan-400 mb-4">{exercise.name} <span className="text-gray-400 text-sm">({exercise.muscle})</span></h2>
                
                <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-2 px-2">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-4 text-center">Вес (кг)</div>
                    <div className="col-span-3 text-center">Повторения</div>
                    <div className="col-span-2 text-center">Готово</div>
                    <div className="col-span-2"></div>
                </div>

                <div className="space-y-3">
                    {exercise.sets.map((set: any, idx: number) => (
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
                                    title={exercise.sets.length <= 1 ? 'Последний подход нельзя убрать' : 'Убрать подход'}
                                    className="text-gray-600 hover:text-red-400 disabled:opacity-20 disabled:hover:text-gray-600 px-2">
                                    <Icon name="close" size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <button onClick={addSet}
                    className="mt-3 w-full py-2.5 rounded-lg border border-dashed border-[var(--border)] text-gray-400 hover:text-cyan-400 hover:border-cyan-400/50 transition text-sm">
                    + Добавить подход
                </button>
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setActiveExIdx(Math.max(0, activeExIdx - 1))} disabled={activeExIdx === 0} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">← Пред.</button>
                <button onClick={() => setActiveExIdx(Math.min(activeWorkout.exercises.length - 1, activeExIdx + 1))} disabled={activeExIdx === activeWorkout.exercises.length - 1} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">След. →</button>
            </div>
        </div>
    );
}

export function GymHistory({ gymData, setGymData, setEditingWorkout }: any) {
    if (gymData.history.length === 0) return <GymEmptyState icon="clock" text="История пуста. Начните первую тренировку!" />;

    const reversedHistory = [...gymData.history].reverse();

    const calcStats = (workout: any) => {
        let totalSets = 0, totalReps = 0, totalTonnage = 0;
        workout.exercises.forEach((ex: any) => {
            ex.sets.forEach((s: any) => {
                if (s.done) {
                    totalSets++;
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    totalReps += r;
                    totalTonnage += w * r;
                }
            });
        });
        const duration = workout.endTime ? (workout.endTime - workout.startTime) / 60000 : 0;
        return { totalSets, totalReps, totalTonnage: Math.round(totalTonnage), duration: Math.round(duration) };
    };

    const deleteWorkout = (workout: any) => {
        const id = workout.id || workout.date;
        setGymData({ ...gymData, history: gymData.history.filter((w: any) => (w.id || w.date) !== id) });
    };

    return (
        <div className="space-y-4">
            {reversedHistory.map((w: any) => {
                const stats = calcStats(w);
                return (
                    <div key={w.id || w.date} className="glass-card p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white">{w.dayName}</h3>
                                <p className="text-gray-400 text-sm">{new Date(w.date).toLocaleString('ru-RU')}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-cyan-400 font-bold">{stats.duration} мин</div>
                                <button onClick={() => setEditingWorkout(w)} className="text-purple-400 text-sm hover:underline">Изменить</button>
                                <button onClick={() => deleteWorkout(w)} className="text-red-400 text-sm hover:underline">Удалить</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center mb-4">
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalTonnage}</div>
                                <div className="text-xs text-gray-400">Тоннаж (кг)</div>
                            </div>
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalSets}</div>
                                <div className="text-xs text-gray-400">Подходы</div>
                            </div>
                            <div className="bg-[var(--bg-input)] p-3 rounded-lg">
                                <div className="text-xl font-bold text-white">{stats.totalReps}</div>
                                <div className="text-xs text-gray-400">Повторения</div>
                            </div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                            {w.exercises.map((ex: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-300">{ex.name}</span>
                                    <span className="text-gray-500">{ex.sets.filter((s:any)=>s.done).map((s: any) => `${s.weight}×${s.reps}`).join(', ')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function GymPRs({ gymData }: any) {
    const [filter, setFilter] = useState('Все');
    
    // Собираем базу всех упражнений и их рекордов
    const db: any = {};
    gymData.history.forEach((w: any) => {
        w.exercises.forEach((ex: any) => {
            if (!db[ex.muscle]) db[ex.muscle] = {};
            if (!db[ex.muscle][ex.name]) db[ex.muscle][ex.name] = { maxWeight: 0, max1RM: 0, maxReps: 0 };
            
            ex.sets.forEach((s: any) => {
                const w = parseFloat(s.weight) || 0;
                const r = parseInt(s.reps) || 0;
                if (w > db[ex.muscle][ex.name].maxWeight) db[ex.muscle][ex.name].maxWeight = w;
                if (r > db[ex.muscle][ex.name].maxReps) db[ex.muscle][ex.name].maxReps = r;
                const e1RM = w * (1 + r / 30);
                if (e1RM > db[ex.muscle][ex.name].max1RM) db[ex.muscle][ex.name].max1RM = e1RM;
            });
        });
    });

    const muscles = ['Все', ...Object.keys(db)];
    if (muscles.length === 1) return <GymEmptyState icon="trophy" text="Нет данных для рекордов." />;

    return (
        <div>
            <h2 className="text-2xl font-bold text-white mb-4">База упражнений и рекорды</h2>
            
            <div className="flex gap-2 mb-6 flex-wrap">
                {muscles.map(m => (
                    <button key={m} onClick={() => setFilter(m)} className={`px-4 py-1 rounded-full text-sm transition ${filter === m ? 'bg-purple-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>
                        {m}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.keys(db).map(muscle => {
                    if (filter !== 'Все' && filter !== muscle) return null;
                    return Object.keys(db[muscle]).map(name => {
                        const pr = db[muscle][name];
                        return (
                            <div key={muscle + name} className="glass-card p-6 rounded-2xl flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-yellow-400/10 text-yellow-400 flex items-center justify-center shrink-0">
                                    <Icon name="trophy" size={22} />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white">{name}</h3>
                                    <p className="text-xs text-gray-500 mb-2">{muscle}</p>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-gray-300">Макс. вес: <span className="text-cyan-400 font-bold">{pr.maxWeight} кг</span></span>
                                        <span className="text-gray-300">1PM: <span className="text-purple-400 font-bold">{pr.max1RM.toFixed(1)} кг</span></span>
                                        <span className="text-gray-300">Макс. повт: <span className="text-green-400 font-bold">{pr.maxReps}</span></span>
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

const GYM_COACH_SYSTEM = `Ты — тёплый, поддерживающий персональный фитнес-тренер в приложении GeQu (пользователь — человек с СДВГ, ему важна ясность и мотивация).
Тебе дают данные в JSON: упражнения активной программы, последние и предыдущие рабочие подходы (вес × повторы), целевой диапазон повторений и качество сна в дни тренировок (0–10).
Задача: дать короткий живой разбор прогресса и конкретную рекомендацию на следующую тренировку по каждому упражнению — увеличить вес, оставить тот же, или сделать разгрузку (deload). Где уместно, связывай спад результатов с плохим сном.
Пиши по-русски, дружелюбно и по делу, без воды и общих фраз. Формат — Markdown: **название упражнения** жирным, затем 1–2 коротких предложения с рекомендацией. В конце добавь одну ободряющую строчку. Не выдумывай данные, которых нет в JSON.`;

function buildGymContext(activeProgram: any, gymData: any, logs: any): any[] {
    const exNames = new Set<string>();
    activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => exNames.add(e.name)));

    const getHistory = (name: string) =>
        gymData.history
            .filter((w: any) => w.exercises.some((e: any) => e.name === name))
            .map((w: any) => ({
                date: w.date,
                sets: w.exercises.find((e: any) => e.name === name).sets.filter((s: any) => s.done),
            }));

    const getDayLog = (dateStr: string) =>
        logs.find((l: any) => l.date.split('T')[0] === dateStr.split('T')[0]);

    const items: any[] = [];
    exNames.forEach((name) => {
        const history = getHistory(name);
        if (history.length === 0 || history[history.length - 1].sets.length === 0) return;

        let targetReps = 10;
        activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => {
            if (e.name === name) {
                const repRange = String(e.reps).split('-');
                targetReps = repRange.length > 1 ? parseInt(repRange[1]) : parseInt(repRange[0]);
            }
        }));

        const summarize = (entry: any) => ({
            date: entry.date.split('T')[0],
            sets: entry.sets.map((s: any) => ({ weight: s.weight, reps: s.reps })),
            sleep: getDayLog(entry.date)?.sleep ?? null,
        });

        const last = history[history.length - 1];
        const prev = history.length >= 2 ? history[history.length - 2] : null;

        items.push({
            exercise: name,
            targetReps,
            last: summarize(last),
            previous: prev && prev.sets.length ? summarize(prev) : null,
        });
    });
    return items;
}

export function GymAI({ gymData, logs }: any) {
    const [output, setOutput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);
    if (!activeProgram) return <GymEmptyState icon="sparkle" text="Нет активной программы." />;

    const context = buildGymContext(activeProgram, gymData, logs);
    if (context.length === 0) return <GymEmptyState icon="sparkle" text="Выполните тренировки, чтобы получить рекомендации." />;

    const askCoach = async () => {
        setLoading(true);
        setError('');
        setOutput('');
        try {
            await streamAI({
                system: GYM_COACH_SYSTEM,
                maxTokens: 1200,
                messages: [{
                    role: 'user',
                    content: `Вот данные по моим упражнениям (JSON):\n\n${JSON.stringify(context, null, 2)}\n\nРазбери мой прогресс и дай рекомендации на следующую тренировку.`,
                }],
                onToken: (chunk) => setOutput((prev) => prev + chunk),
            });
        } catch (e: any) {
            setError(e?.message || 'Не удалось получить ответ от ИИ.');
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
                        ИИ-тренер
                    </h3>
                    <p className="text-sm text-gray-400">Проанализирую твои последние результаты, целевые повторы и связь со сном, и подскажу что делать дальше.</p>
                </div>
                <button
                    onClick={askCoach}
                    disabled={loading}
                    className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg disabled:opacity-50 whitespace-nowrap"
                >
                    {loading ? 'Думаю…' : output ? 'Обновить разбор' : 'Получить разбор'}
                </button>
            </div>

            {error && (
                <div className="glass-card p-4 rounded-xl border border-red-400/30 text-red-400 text-sm">{error}</div>
            )}

            {(output || loading) && (
                <div className="glass-card p-6 rounded-2xl">
                    {output
                        ? <div className="text-gray-200 markdown-content" dangerouslySetInnerHTML={{ __html: marked.parse(output) as string }} />
                        : <div className="text-gray-500 text-sm animate-pulse">Анализирую данные…</div>}
                </div>
            )}
        </div>
    );
}
