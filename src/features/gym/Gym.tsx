import { useState } from 'react';

export function GymApp({ gymData, setGymData, logs }: any) {
    const [view, setView] = useState('home');
    const [activeWorkout, setActiveWorkout] = useState<any>(null);
    const [editingWorkout, setEditingWorkout] = useState<any>(null);

    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);

    const startWorkout = (day: any) => {
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
            date: new Date().toISOString(),
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
        { id: 'calendar', label: 'Календарь' },
        { id: 'balance', label: 'Баланс' },
        { id: 'pr', label: 'Рекорды' },
        { id: 'ai', label: 'ИИ-Тренер' },
    ];

    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Спортзал</h1>
            <div className="flex gap-2 mb-8 border-b border-[var(--border)] pb-2 overflow-x-auto">
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setView(t.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${view === t.id ? 'text-cyan-400 bg-cyan-400/10' : 'text-gray-400 hover:bg-white/5'}`}>{t.label}</button>
                ))}
            </div>

            {view === 'home' && <GymHome activeProgram={activeProgram} gymData={gymData} startWorkout={startWorkout} setView={setView} />}
            {view === 'programs' && <GymPrograms gymData={gymData} setGymData={setGymData} />}
            {view === 'history' && <GymHistory gymData={gymData} setGymData={setGymData} setEditingWorkout={setEditingWorkout} />}
            {view === 'calendar' && <GymCalendar gymData={gymData} />}
            {view === 'balance' && <GymMuscleBalance gymData={gymData} />}
            {view === 'pr' && <GymPRs gymData={gymData} />}
            {view === 'ai' && <GymAI gymData={gymData} logs={logs} />}
        </div>
    );
}

export function GymHome({ activeProgram, gymData, startWorkout, setView }: any) {
    if (!activeProgram) {
        return (
            <div className="glass-card p-8 rounded-2xl text-center">
                <p className="text-xl text-gray-300 mb-4">У вас нет активной программы.</p>
                <button onClick={() => setView('programs')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-3 rounded-lg">Создать программу</button>
            </div>
        );
    }

    const lastWorkout = gymData.history[gymData.history.length - 1];
    const todayDay = activeProgram.days[0]; 

    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                    <p className="text-gray-400 text-sm mb-1">Сегодня:</p>
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">{todayDay?.name || "Отдых"}</h3>
                    {todayDay && (
                        <button onClick={() => startWorkout(todayDay)} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-3 rounded-lg">
                            Начать тренировку
                        </button>
                    )}
                </div>
                <div className="glass-card p-6 rounded-2xl">
                    <p className="text-gray-400 text-sm mb-1">Последняя:</p>
                    <h3 className="text-xl font-bold text-white mb-2">{lastWorkout ? lastWorkout.dayName : "Нет данных"}</h3>
                    <p className="text-gray-400 text-sm">{lastWorkout ? new Date(lastWorkout.date).toLocaleDateString('ru-RU') : "—"}</p>
                </div>
            </div>
        </div>
    );
}

export function GymPrograms({ gymData, setGymData }: any) {
    const [editingProgram, setEditingProgram] = useState<any>(null);

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
            <button onClick={createProgram} className="mb-6 bg-cyan-400 text-black font-bold px-6 py-3 rounded-lg">+ Создать программу</button>
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
                    <div className="col-span-4 text-center">Повторения</div>
                    <div className="col-span-3 text-center">Готово</div>
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
                            <div className="col-span-4">
                                <input type="number" value={set.reps} onChange={e => updateSet(idx, 'reps', parseInt(e.target.value) || 0)} className="w-full bg-transparent border border-[var(--border)] rounded-md p-2 text-center text-white" />
                            </div>
                            <div className="col-span-3 flex justify-center">
                                <button onClick={() => toggleDone(idx)} className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${set.done ? 'bg-green-400 border-green-400 text-black' : 'border-gray-500 text-transparent'}`}>✓</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-between mt-6">
                <button onClick={() => setActiveExIdx(Math.max(0, activeExIdx - 1))} disabled={activeExIdx === 0} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">← Пред.</button>
                <button onClick={() => setActiveExIdx(Math.min(activeWorkout.exercises.length - 1, activeExIdx + 1))} disabled={activeExIdx === activeWorkout.exercises.length - 1} className="bg-white/5 text-gray-400 px-6 py-3 rounded-lg disabled:opacity-20">След. →</button>
            </div>
        </div>
    );
}

export function GymHistory({ gymData, setGymData, setEditingWorkout }: any) {
    if (gymData.history.length === 0) return <div className="glass-card p-8 text-center text-gray-400">История пуста. Начните первую тренировку!</div>;

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

export function GymCalendar({ gymData }: any) {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const emptyDays = Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => `empty-${i}`);
    const days = Array.from({ length: daysInMonth }).map((_, i) => i + 1);

    const getWorkoutForDay = (day: number) => {
        const dateStr = new Date(year, month, day).toISOString().split('T')[0];
        return gymData.history.find((w: any) => w.date.split('T')[0] === dateStr);
    };

    return (
        <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-4 text-center">{today.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</h2>
            <div className="grid grid-cols-7 gap-2 text-center text-xs text-gray-400 mb-2">
                {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {emptyDays.map(d => <div key={d}></div>)}
                {days.map(day => {
                    const workout = getWorkoutForDay(day);
                    const isToday = day === today.getDate();
                    return (
                        <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-lg border ${isToday ? 'border-cyan-400' : 'border-[var(--border)]'} ${workout ? 'bg-green-500/20' : 'bg-[var(--bg-input)]'}`}>
                            <span className={`text-sm ${workout ? 'text-green-400 font-bold' : 'text-gray-400'}`}>{day}</span>
                            {workout && <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1"></div>}
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500/30 border border-green-400"></div>Тренировка</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-[var(--bg-input)] border border-[var(--border)]"></div>Отдых</div>
            </div>
        </div>
    );
}

export function GymMuscleBalance({ gymData }: any) {
    const muscleData: any = {};
    gymData.history.forEach((w: any) => {
        w.exercises.forEach((ex: any) => {
            if (!muscleData[ex.muscle]) muscleData[ex.muscle] = 0;
            ex.sets.forEach((s: any) => {
                if (s.done) {
                    muscleData[ex.muscle] += (parseFloat(s.weight) || 0) * (parseInt(s.reps) || 0);
                }
            });
        });
    });

    const muscles = Object.keys(muscleData);
    if (muscles.length === 0) return <div className="glass-card p-8 text-center text-gray-400">Нет данных. Выполните тренировку.</div>;

    const maxTonnage = Math.max(...(Object.values(muscleData) as number[]), 1);

    return (
        <div className="glass-card p-6 rounded-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Распределение нагрузки (кг)</h2>
            <div className="space-y-4">
                {muscles.map(m => (
                    <div key={m}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-300">{m}</span>
                            <span className="text-cyan-400">{Math.round(muscleData[m])} кг</span>
                        </div>
                        <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden">
                            <div className="bg-gradient-to-r from-cyan-400 to-purple-400 h-3 rounded-full transition-all duration-500" style={{ width: `${(muscleData[m] / maxTonnage) * 100}%` }}></div>
                        </div>
                    </div>
                ))}
            </div>
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
    if (muscles.length === 1) return <div className="glass-card p-8 text-center text-gray-400">Нет данных для рекордов.</div>;

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
                                <div className="text-4xl">🏆</div>
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

export function GymAI({ gymData, logs }: any) {
    const activeProgram = gymData.programs.find((p: any) => p.id === gymData.activeProgramId);
    if (!activeProgram) return <div className="glass-card p-8 text-center text-gray-400">Нет активной программы.</div>;

    const exNames = new Set();
    activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => exNames.add(e.name)));

    const getHistory = (name: string) => {
        return gymData.history.filter((w: any) => w.exercises.some((e: any) => e.name === name)).map((w: any) => ({
            date: w.date,
            sets: w.exercises.find((e: any) => e.name === name).sets.filter((s:any) => s.done)
        }));
    };

    const getDayLog = (dateStr: string) => {
        return logs.find((l: any) => l.date.split('T')[0] === dateStr.split('T')[0]);
    };

    const recommendations: any[] = [];

    exNames.forEach((name: any) => {
        const history = getHistory(name);
        if (history.length === 0) return;

        const last = history[history.length - 1];
        if(last.sets.length === 0) return;

        const lastMaxWeight = Math.max(...last.sets.map((s: any) => s.weight));
        const lastTotalReps = last.sets.reduce((sum: number, s: any) => sum + s.reps, 0);

        let targetReps = 10;
        activeProgram.days.forEach((d: any) => d.exercises.forEach((e: any) => {
            if (e.name === name) {
                const repRange = e.reps.split('-');
                targetReps = repRange.length > 1 ? parseInt(repRange[1]) : parseInt(repRange[0]);
            }
        }));

        const allSetsHitTarget = last.sets.every((s: any) => s.reps >= targetReps);
        const dayLog = getDayLog(last.date);

        if (allSetsHitTarget && history.length >= 1) {
            recommendations.push({
                name,
                text: `Вы успешно выполнили все подходы (${lastTotalReps} повт.). Рекомендуется увеличить рабочий вес до ${lastMaxWeight + 2.5} кг.`,
                status: 'up'
            });
        } else if (history.length >= 2) {
            const prev = history[history.length - 2];
            if(prev.sets.length === 0) return;
            const prevMaxWeight = Math.max(...prev.sets.map((s: any) => s.weight));
            
            if (lastMaxWeight < prevMaxWeight) {
                let extraText = "";
                if (dayLog && dayLog.sleep < 5) {
                    extraText = ` В день тренировки ваш сон был низким (${dayLog.sleep}/10), что, вероятно, снизило силу.`;
                }
                recommendations.push({
                    name,
                    text: `Наблюдается снижение результата (было ${prevMaxWeight} кг, стало ${lastMaxWeight} кг).${extraText} Рекомендуется провести легкую тренировку (deload).`,
                    status: 'down'
                });
            } else {
                recommendations.push({
                    name,
                    text: `Не все подходы достигли целевого диапазона повторений (${targetReps}). Рекомендуется сохранить текущий вес (${lastMaxWeight} кг).`,
                    status: 'stay'
                });
            }
        } else {
            recommendations.push({
                name,
                text: `Недостаточно данных для анализа. Продолжайте выполнять упражнение с текущим весом (${lastMaxWeight} кг).`,
                status: 'stay'
            });
        }
    });

    if (recommendations.length === 0) return <div className="glass-card p-8 text-center text-gray-400">Выполните тренировки, чтобы получить рекомендации.</div>;

    return (
        <div className="space-y-4">
            <div className="glass-card p-4 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-sm">
                ИИ-анализатор проверяет ваши последние результаты, целевые повторения и связь с качеством сна.
            </div>
            {recommendations.map((rec: any, i: number) => (
                <div key={i} className="glass-card p-6 rounded-2xl flex gap-4">
                    <div className={`text-3xl ${rec.status === 'up' ? 'text-green-400' : rec.status === 'down' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {rec.status === 'up' ? '📈' : rec.status === 'down' ? '📉' : '➡️'}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-1">{rec.name}</h3>
                        <p className="text-gray-300">{rec.text}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
