// Mock data for the concept-v2 redesign preview. Not wired to real DB/state.

export const MOCK = {
    level: 6,
    xp: 2015,
    xpToNext: 3000,
    energy: 5.0,
    sleep: 4.1,
    focus: 7.5,
    mood: 5.9,
    tasksDone: 0,
    tasksQueued: 1,
    workouts: 4,
    workoutsVolume: 19390,
    testsCount: 52,
    helped: [
        { label: 'Интерес к задаче', count: 7 },
        { label: 'Кофе', count: 7 },
        { label: 'Питание', count: 6 },
        { label: 'Тест', count: 6 },
    ],
    hindered: [
        { label: 'Откладывание', count: 5 },
        { label: 'Усталость', count: 3 },
        { label: 'Голод', count: 2 },
    ],
    user: {
        name: 'Игрок',
        level: 6,
        energy: 5.0,
    },
};
