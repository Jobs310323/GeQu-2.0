import type { CognitiveEngine } from './types';

// The twelve exercises, described.
//
// `plausibleRange` is what the score can realistically span for a general adult
// on a phone or laptop, used only to put a first attempt on a 0–100 scale before
// personal history exists. It is a display convenience, NOT a norm: it says
// nothing about where a person stands relative to anyone else, and the moment
// enough of their own attempts exist the range stops being used (see
// `scoring.ts`).
//
// `limitations` are shown next to results. Every one of these is real and was
// written by reading what the exercise actually does — a caveat that is vague
// enough to apply to anything ("results may vary") is worse than none, because
// it teaches the user to skip the caveats that matter.

export const ENGINES: readonly CognitiveEngine[] = [
    {
        id: 'schulte',
        label: 'Таблица Шульте',
        version: '1.0.0',
        domain: 'attention',
        mode: 'assess',
        unit: 'сек',
        lowerIsBetter: true,
        plausibleRange: [15, 90],
        limitations: [
            'Скорость зависит от размера экрана и от того, пальцем или мышью ты нажимаешь.',
            'Повторные попытки подряд обычно быстрее за счёт привычки к сетке, а не внимания.',
        ],
    },
    {
        id: 'reaction',
        label: 'Скорость реакции',
        version: '1.0.0',
        domain: 'processing',
        mode: 'assess',
        unit: 'мс',
        lowerIsBetter: true,
        plausibleRange: [150, 600],
        limitations: [
            'Задержка экрана и способа ввода входит в результат — на разных устройствах числа несопоставимы.',
            'Измеряется простая реакция, а не внимание в целом.',
        ],
    },
    {
        id: 'tmt',
        label: 'Соединение чисел',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unit: 'сек',
        lowerIsBetter: true,
        plausibleRange: [15, 120],
        limitations: [
            'Это не клинический Trail Making Test: протокол и нормы другие.',
            'Мелкий экран заметно замедляет попадание по целям.',
        ],
    },
    {
        id: 'stroop',
        label: 'Тест Струпа',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unit: 'очки',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitations: [
            'Считается число верных ответов за время, а не классический интерференционный балл.',
            'Результат сильно зависит от того, насколько ты спешишь.',
        ],
    },
    {
        id: 'digitspan',
        label: 'Память на числа',
        version: '1.0.0',
        domain: 'memory',
        mode: 'assess',
        unit: 'уровень',
        lowerIsBetter: false,
        plausibleRange: [3, 12],
        limitations: [
            'Проговаривание вслух или запись резко меняют результат.',
            'Одна попытка — грубая оценка: разброс между попытками обычно ±1 уровень.',
        ],
    },
    {
        id: 'corsi',
        label: 'Тест Корси',
        version: '1.0.0',
        domain: 'memory',
        mode: 'assess',
        unit: 'длина',
        lowerIsBetter: false,
        plausibleRange: [2, 10],
        limitations: [
            'Зрительно-пространственная память, а не память вообще.',
            'Размер и расположение сетки влияют на результат.',
        ],
    },
    {
        id: 'nback',
        label: 'N-Back',
        version: '1.0.0',
        domain: 'memory',
        mode: 'train',
        unit: '% точности',
        lowerIsBetter: false,
        plausibleRange: [0, 100],
        limitations: [
            'Точность зависит от выбранного уровня N — сравнивай только одинаковые уровни.',
            'Тренировка N-back улучшает N-back; перенос на другие задачи не доказан.',
        ],
    },
    {
        id: 'gonogo',
        label: 'Go / No-Go',
        version: '1.0.0',
        domain: 'executive',
        mode: 'assess',
        unit: 'очки',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitations: [
            'Один показатель смешивает скорость и сдержанность — их стоит смотреть отдельно.',
            'Короткая серия даёт большой разброс.',
        ],
    },
    {
        id: 'arithmetic',
        label: 'Устный счёт',
        version: '1.0.0',
        domain: 'processing',
        mode: 'train',
        unit: 'очки',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitations: [
            'Зависит от привычки к устному счёту не меньше, чем от текущего состояния.',
        ],
    },
    {
        id: 'switching',
        label: 'Переключение задач',
        version: '1.0.0',
        domain: 'executive',
        mode: 'train',
        unit: 'очки',
        lowerIsBetter: false,
        plausibleRange: [0, 40],
        limitations: [
            'Цена переключения здесь не измеряется отдельно — только общий счёт.',
        ],
    },
] as const;

const BY_ID = new Map(ENGINES.map(e => [e.id, e]));

export function engineFor(id: string): CognitiveEngine | undefined {
    return BY_ID.get(id);
}

/** Exercises grouped for the Train / Assess split. */
export const assessments = (): readonly CognitiveEngine[] => ENGINES.filter(e => e.mode === 'assess');
export const drills = (): readonly CognitiveEngine[] => ENGINES.filter(e => e.mode === 'train');
