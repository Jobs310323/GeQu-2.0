// Validated screening questionnaires, with their real scoring rules.
//
// Scoring is implemented per instrument rather than as a generic sum: ASRS
// Part A uses per-item thresholds, PSS-10 reverses four items, and WHO-5
// multiplies the raw score by 4. Getting these wrong would quietly produce
// meaningless numbers, so each one is spelled out.

export type Option = { text: string; val: number };
export type Band = { min: number; max: number; label: string; tone: 'good' | 'mild' | 'moderate' | 'high' };

export type ClinicalTest = {
    id: string;
    name: string;
    short: string;
    intro: string;
    period: string;
    questions: string[];
    options: Option[];
    /** Indices (0-based) whose scale is reversed before summing. */
    reversed?: number[];
    /** ASRS-style: count items crossing a per-item threshold instead of summing. */
    thresholds?: number[];
    /** Multiplier applied to the raw score (WHO-5 reports 0–100). */
    multiplier?: number;
    maxScore: number;
    bands: Band[];
    note?: string;
};

const FREQ_4: Option[] = [
    { text: 'Никогда', val: 0 },
    { text: 'Редко', val: 1 },
    { text: 'Иногда', val: 2 },
    { text: 'Часто', val: 3 },
    { text: 'Очень часто', val: 4 },
];

const PHQ_OPTS: Option[] = [
    { text: 'Совсем нет', val: 0 },
    { text: 'Несколько дней', val: 1 },
    { text: 'Больше половины дней', val: 2 },
    { text: 'Почти каждый день', val: 3 },
];

const PSS_OPTS: Option[] = [
    { text: 'Никогда', val: 0 },
    { text: 'Почти никогда', val: 1 },
    { text: 'Иногда', val: 2 },
    { text: 'Довольно часто', val: 3 },
    { text: 'Очень часто', val: 4 },
];

export const CLINICAL_TESTS: ClinicalTest[] = [
    {
        id: 'asrs',
        name: 'ASRS-v1.1 · скрининг СДВГ',
        short: 'СДВГ',
        intro: 'Часть A шкалы самооценки ВОЗ — шесть вопросов, лучше всего предсказывающих СДВГ у взрослых.',
        period: 'За последние 6 месяцев',
        questions: [
            'Как часто вам трудно доводить до конца детали проекта, когда самые сложные части уже позади?',
            'Как часто вам трудно организовать выполнение задачи, требующей порядка?',
            'Как часто вы забываете о назначенных встречах или обязательствах?',
            'Как часто вы откладываете начало задач, требующих длительных умственных усилий?',
            'Как часто вы ёрзаете руками или ногами, когда приходится долго сидеть?',
            'Как часто вы чувствуете себя чрезмерно активным, будто вас «заводит мотор»?',
        ],
        options: FREQ_4,
        // Items 1–3 count from «Иногда», items 4–6 only from «Часто».
        thresholds: [2, 2, 2, 3, 3, 3],
        maxScore: 6,
        bands: [
            { min: 0, max: 3, label: 'Признаков немного', tone: 'good' },
            { min: 4, max: 6, label: 'Симптомы, характерные для СДВГ', tone: 'high' },
        ],
        note: 'Считается число ответов, перешагнувших порог. 4 и больше — результат, при котором обычно рекомендуют очную диагностику.',
    },
    {
        id: 'phq9',
        name: 'PHQ-9 · настроение',
        short: 'Настроение',
        intro: 'Девять пунктов о признаках сниженного настроения. Один из самых распространённых скринингов в мире.',
        period: 'За последние 2 недели',
        questions: [
            'Мало интереса или удовольствия от привычных занятий',
            'Подавленность, угнетённость или чувство безнадёжности',
            'Трудности с засыпанием, прерывистый сон или, наоборот, слишком долгий сон',
            'Усталость или ощущение, что сил совсем мало',
            'Плохой аппетит или переедание',
            'Недовольство собой, ощущение, что вы неудачник или подвели близких',
            'Трудно сосредоточиться — например, на чтении или просмотре фильма',
            'Двигаетесь или говорите заметно медленнее обычного — либо, наоборот, суетливее',
            'Мысли о том, что лучше бы вам не жить, или о причинении себе вреда',
        ],
        options: PHQ_OPTS,
        maxScore: 27,
        bands: [
            { min: 0, max: 4, label: 'Минимальные проявления', tone: 'good' },
            { min: 5, max: 9, label: 'Лёгкие проявления', tone: 'mild' },
            { min: 10, max: 14, label: 'Умеренные проявления', tone: 'moderate' },
            { min: 15, max: 19, label: 'Умеренно выраженные', tone: 'high' },
            { min: 20, max: 27, label: 'Выраженные проявления', tone: 'high' },
        ],
        note: 'Начиная с 10 баллов результат принято обсуждать со специалистом.',
    },
    {
        id: 'gad7',
        name: 'GAD-7 · тревога',
        short: 'Тревога',
        intro: 'Семь пунктов о признаках генерализованной тревоги.',
        period: 'За последние 2 недели',
        questions: [
            'Чувство нервозности, тревоги или взвинченности',
            'Не получается остановить или контролировать беспокойство',
            'Слишком сильное беспокойство по разным поводам',
            'Трудно расслабиться',
            'Такое беспокойство, что трудно усидеть на месте',
            'Лёгкое раздражение или вспыльчивость',
            'Страх, будто вот-вот случится что-то плохое',
        ],
        options: PHQ_OPTS,
        maxScore: 21,
        bands: [
            { min: 0, max: 4, label: 'Минимальная тревога', tone: 'good' },
            { min: 5, max: 9, label: 'Лёгкая тревога', tone: 'mild' },
            { min: 10, max: 14, label: 'Умеренная тревога', tone: 'moderate' },
            { min: 15, max: 21, label: 'Выраженная тревога', tone: 'high' },
        ],
        note: 'Начиная с 10 баллов результат принято обсуждать со специалистом.',
    },
    {
        id: 'isi',
        name: 'ISI · качество сна',
        short: 'Сон',
        intro: 'Индекс тяжести бессонницы: насколько сон нарушен и как это сказывается на дне.',
        period: 'За последние 2 недели',
        questions: [
            'Трудности с засыпанием',
            'Трудности с поддержанием сна (просыпаетесь ночью)',
            'Слишком раннее пробуждение',
            'Насколько вы довольны своим сном сейчас?',
            'Насколько нарушения сна мешают вашей повседневной жизни?',
            'Насколько окружающим заметно, что проблемы со сном ухудшают ваше состояние?',
            'Насколько вы обеспокоены своим сном?',
        ],
        options: [
            { text: 'Совсем нет', val: 0 },
            { text: 'Слегка', val: 1 },
            { text: 'Умеренно', val: 2 },
            { text: 'Сильно', val: 3 },
            { text: 'Очень сильно', val: 4 },
        ],
        maxScore: 28,
        bands: [
            { min: 0, max: 7, label: 'Клинически значимой бессонницы нет', tone: 'good' },
            { min: 8, max: 14, label: 'Подпороговая бессонница', tone: 'mild' },
            { min: 15, max: 21, label: 'Умеренная бессонница', tone: 'moderate' },
            { min: 22, max: 28, label: 'Выраженная бессонница', tone: 'high' },
        ],
    },
    {
        id: 'pss10',
        name: 'PSS-10 · воспринимаемый стресс',
        short: 'Стресс',
        intro: 'Десять вопросов о том, насколько непредсказуемой и неуправляемой ощущается жизнь.',
        period: 'За последний месяц',
        questions: [
            'Как часто вы расстраивались из-за чего-то неожиданного?',
            'Как часто вы чувствовали, что не можете контролировать важные вещи в жизни?',
            'Как часто вы чувствовали себя нервным и напряжённым?',
            'Как часто вы были уверены в своей способности справляться с личными проблемами?',
            'Как часто вы чувствовали, что всё складывается так, как вам нужно?',
            'Как часто вы обнаруживали, что не справляетесь со всеми делами?',
            'Как часто вам удавалось контролировать раздражение?',
            'Как часто вы чувствовали, что держите всё под контролем?',
            'Как часто вы злились из-за того, что было вне вашего контроля?',
            'Как часто трудности накапливались так, что вы не могли их преодолеть?',
        ],
        options: PSS_OPTS,
        // Positively worded items are scored in reverse.
        reversed: [3, 4, 6, 7],
        maxScore: 40,
        bands: [
            { min: 0, max: 13, label: 'Низкий уровень стресса', tone: 'good' },
            { min: 14, max: 26, label: 'Умеренный уровень стресса', tone: 'moderate' },
            { min: 27, max: 40, label: 'Высокий уровень стресса', tone: 'high' },
        ],
    },
    {
        id: 'who5',
        name: 'WHO-5 · благополучие',
        short: 'Благополучие',
        intro: 'Пять коротких утверждений о самочувствии. Здесь чем больше баллов, тем лучше.',
        period: 'За последние 2 недели',
        questions: [
            'Я чувствовал себя бодрым и в хорошем настроении',
            'Я чувствовал себя спокойным и расслабленным',
            'Я чувствовал себя активным и энергичным',
            'Я просыпался отдохнувшим',
            'Моя повседневная жизнь была наполнена тем, что мне интересно',
        ],
        options: [
            { text: 'Никогда', val: 0 },
            { text: 'Иногда', val: 1 },
            { text: 'Менее половины времени', val: 2 },
            { text: 'Более половины времени', val: 3 },
            { text: 'Большую часть времени', val: 4 },
            { text: 'Всё время', val: 5 },
        ],
        multiplier: 4, // raw 0–25 is reported as 0–100
        maxScore: 100,
        bands: [
            { min: 0, max: 28, label: 'Низкое благополучие', tone: 'high' },
            { min: 29, max: 50, label: 'Сниженное благополучие', tone: 'moderate' },
            { min: 51, max: 75, label: 'Нормальное благополучие', tone: 'mild' },
            { min: 76, max: 100, label: 'Высокое благополучие', tone: 'good' },
        ],
        note: 'Здесь высокий балл — хороший знак. Ниже 50 обычно считают поводом присмотреться к себе.',
    },
];

export function scoreTest(test: ClinicalTest, answers: (number | null)[]): number {
    const vals = answers.map(a => (a === null ? 0 : a));

    if (test.thresholds) {
        return vals.reduce((n, v, i) => n + (v >= test.thresholds![i] ? 1 : 0), 0);
    }

    const maxOpt = Math.max(...test.options.map(o => o.val));
    const raw = vals.reduce((sum, v, i) =>
        sum + (test.reversed?.includes(i) ? maxOpt - v : v), 0);

    return raw * (test.multiplier ?? 1);
}

export function bandFor(test: ClinicalTest, score: number): Band {
    return test.bands.find(b => score >= b.min && score <= b.max) ?? test.bands[test.bands.length - 1];
}

export const TONE_CLASS: Record<Band['tone'], string> = {
    good: 'text-green-400 border-green-400/40 bg-green-400/10',
    mild: 'text-cyan-400 border-cyan-400/40 bg-cyan-400/10',
    moderate: 'text-yellow-400 border-yellow-400/40 bg-yellow-400/10',
    high: 'text-red-400 border-red-400/40 bg-red-400/10',
};
