import { useState } from 'react';

export function AboutAdhd() {
    const [view, setView] = useState('info');
    return (
        <div>
            <h1 className="text-3xl font-bold mb-8">Про СДВГ</h1>
            <div className="flex gap-4 mb-6">
                <button onClick={() => setView('info')} className={`px-4 py-2 rounded-lg transition ${view === 'info' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>Что это такое?</button>
                <button onClick={() => setView('test')} className={`px-4 py-2 rounded-lg transition ${view === 'test' ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400' : 'text-gray-400 border border-[var(--border)]'}`}>Клинический тест</button>
            </div>
            {view === 'info' ? <AdhdInfo /> : <AdhdTest />}
        </div>
    );
}

export function AdhdInfo() {
    return (
        <div className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">Что такое СДВГ у взрослых?</h2>
                <p className="text-gray-300 leading-relaxed mb-3">
                    Синдром дефицита внимания и гиперактивности (СДВГ) — это нейробиологическое расстройство, которое характеризуется трудностями с концентрацией внимания, импульсивностью и, в некоторых случаях, гиперактивностью. 
                    Вопреки мифу, это не просто "детская болезнь". У 60-70% детей с СДВГ симптомы сохраняются и во взрослом возрасте.
                </p>
                <p className="text-gray-300 leading-relaxed">
                    Мозг человека с СДВГ работает иначе: у него наблюдается дефицит дофамина и норадреналина (нейромедиаторов, отвечающих за мотивацию, контроль импульсов и чувство удовлетворения). Это не вопрос лени или слабой воли, это физиологическая особенность.
                </p>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-purple-400 mb-4">Основные симптомы и проявления</h2>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-xl text-white mb-2">Невнимательность</h3>
                        <ul className="list-disc list-inside text-gray-400 space-y-1">
                            <li>Трудности с удержанием внимания на скучных или рутинных задачах.</li>
                            <li>Постоянное откладывание дел (прокрастинация).</li>
                            <li>Забывчивость: потеря ключей, телефонов, забытые обещания.</li>
                            <li>Потеря нити разговора, "отключение" посреди беседы.</li>
                            <li>Сложности с организацией времени и пространства (беспорядок).</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl text-white mb-2">Импульсивность и Гиперактивность</h3>
                        <ul className="list-disc list-inside text-gray-400 space-y-1">
                            <li>Нетерпеливость: трудно ждать своей очереди.</li>
                            <li>Перебивание собеседника, выпаливание ответа до конца вопроса.</li>
                            <li>Внутреннее беспокойство (ощущение "заведенного мотора").</li>
                            <li>Склонность к рискованным действиям (быстрая езда, импульсивные покупки).</li>
                            <li>Сложности с фильтрацией мыслей (говорю всё, что приходит в голову).</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl">
                <h2 className="text-2xl font-bold text-pink-400 mb-4">Как СДВГ влияет на жизнь?</h2>
                <div className="space-y-4 text-gray-300">
                    <p><span className="text-white font-semibold">Работа и учеба:</span> Трудности с долгосрочными проектами, частая смена работы из-за скуки или конфликтов с начальством, "горение" дедлайнами (синдром студента: делают всё за ночь до сдачи).</p>
                    <p><span className="text-white font-semibold">Отношения:</span> Эмоциональные качели (RSD — отверженная чувствительная дисфория), внезапные вспышки гнева или слез. Партнеру может казаться, что человек с СДВГ его не слушает или не ценит.</p>
                    <p><span className="text-white font-semibold">Быт и финансы:</span> Накопление хлама (синдром Диогена в легкой форме), неоплаченные вовремя счета, импульсивные траты, забытые на плите кастрюли.</p>
                    <p><span className="text-white font-semibold">Психическое здоровье:</span> Частые спутники СДВГ — тревожность, депрессия, нарушения сна и зависимости (алкоголь, игры, соцсети), так как мозг ищет быстрый дофамин.</p>
                </div>
            </div>

            <div className="glass-card p-6 rounded-2xl border border-cyan-400/30">
                <h2 className="text-2xl font-bold text-cyan-400 mb-4">СДВГ — это не приговор</h2>
                <p className="text-gray-300 leading-relaxed">
                    При правильном подходе (медикаменты, когнитивно-поведенческая терапия, структуры и привычки) люди с СДВГ могут достигать невероятных высот. Креативность, способность к гиперфокусу на интересных задачах, нестандартное мышление и энергия — это суперсилы, которые идут в комплекте с СДВГ. Главное — научиться управлять своими "слабыми местами".
                </p>
            </div>
        </div>
    );
}

export function AdhdTest() {
    const questions = [
        "Как часто вам трудно доводить до конца детали проекта, после того как вы уже справились с самыми сложными его частями?",
        "Как часто вам трудно организовать выполнение задачи или деятельности?",
        "Как часто вы забываете о назначенных встречах или обязательствах?",
        "Как часто вы избегаете, откладываете или оттягиваете начало выполнения задач, требующих больших умственных усилий?",
        "Как часто вы ерзаете руками или ногами, когда вам приходится сидеть долгое время?",
        "Как часто вы чувствуете себя слишком активным и нуждаетесь в том, чтобы что-то делать, как будто вас «заводит мотор»?",
        "Как часто вы совершаете ошибки по невнимательности, когда выполняете скучную или повторяющуюся работу?",
        "Как часто вам трудно сконцентрироваться на том, что вам говорят, даже когда вы слушаете напрямую?",
        "Как часто вам трудно запоминать, куда вы положили вещи (ключи, кошелек, телефон)?",
        "Как часто вас отвлекают посторонние звуки или шумы?",
        "Как часто вы встаете и ходите в ситуациях, когда ожидается, что вы будете сидеть на месте?",
        "Как часто вы чувствуете беспокойство или суетливость?",
        "Как часто вам трудно расслабиться, даже когда у вас есть свободное время?",
        "Как часто вы обнаруживаете, что разговариваете слишком много, когда находитесь в социальной ситуации?",
        "Как часто вы перебиваете других, когда они заняты?",
        "Как часто вы чувствуете, что вам трудно дождаться своей очереди в ситуациях, когда это необходимо?",
        "Как часто вы вторгаетесь в разговор или деятельность других людей?",
        "Как часто вы теряете нить разговора, когда кто-то говорит с вами?"
    ];
    const options = [
        { text: "Никогда", val: 0 },
        { text: "Редко", val: 1 },
        { text: "Иногда", val: 2 },
        { text: "Часто", val: 3 },
        { text: "Очень часто", val: 4 }
    ];

    const [answers, setAnswers] = useState<any[]>(Array(18).fill(null));
    const [result, setResult] = useState<any>(null);

    const handleAnswer = (qIndex: number, val: number) => {
        const newAnswers = [...answers];
        newAnswers[qIndex] = val;
        setAnswers(newAnswers);
    };

    const calculateResult = () => {
        const total = answers.reduce((sum, val) => sum + val, 0);
        const maxScore = 18 * 4;
        const percent = Math.round((total / maxScore) * 100);
        let verdict = "";
        
        const partA = answers.slice(0, 6).filter(v => v >= 3).length;
        
        if (partA >= 4 || percent >= 60) {
            verdict = "Высокая вероятность СДВГ. Ваши ответы сильно соответствуют клинической картине. Рекомендуется обратиться к врачу-психиатру для точной диагностики.";
        } else if (percent >= 35) {
            verdict = "Умеренная вероятность СДВГ. У вас есть ряд симптомов, которые могут мешать жизни. Стоит внимательнее прислушаться к себе и, возможно, проконсультироваться со специалистом.";
        } else {
            verdict = "Низкая вероятность СДВГ. Скорее всего, ваши трудности с вниманием вызваны другими факторами (стресс, усталость, информационный перегруз).";
        }
        setResult({ score: total, percent, verdict });
    };

    return (
        <div className="glass-card p-8 rounded-2xl">
            <h2 className="text-2xl font-bold text-white mb-2">Тест на СДВГ (ASRS-v1.1)</h2>
            <p className="text-gray-400 mb-6">Шкала скрининга СДВГ у Всемирной организации здравоохранения. Ответьте на 18 вопросов честно, основываясь на вашем поведении за последние 6 месяцев.</p>
            
            {!result ? (
                <div className="space-y-6">
                    {questions.map((q, i) => (
                        <div key={i} className="border-b border-[var(--border)] pb-4">
                            <p className="text-gray-300 mb-3">{i+1}. {q}</p>
                            <div className="flex flex-wrap gap-2">
                                {options.map(opt => (
                                    <button key={opt.val} onClick={() => handleAnswer(i, opt.val)}
                                        className={`px-4 py-2 rounded-lg text-sm border transition ${
                                            answers[i] === opt.val ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400' : 'border-[var(--border)] text-gray-400 hover:border-gray-500'
                                        }`}>{opt.text}</button>
                                ))}
                            </div>
                        </div>
                    ))}
                    <button onClick={calculateResult} disabled={answers.includes(null)}
                        className={`w-full font-bold py-3 rounded-lg transition ${answers.includes(null) ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-400 to-purple-400 text-black hover:opacity-90'}`}>
                        {answers.includes(null) ? `Ответьте на все вопросы (${answers.filter(a => a !== null).length}/18)` : 'Узнать результат'}
                    </button>
                </div>
            ) : (
                <div className="text-center">
                    <div className="text-6xl font-bold text-cyan-400 mb-2">{result.percent}%</div>
                    <div className="text-xl text-gray-300 mb-6">Вероятность наличия симптомов СДВГ</div>
                    <div className={`p-6 rounded-xl mb-6 text-left ${result.percent >= 60 ? 'bg-red-500/10 border border-red-500/30' : result.percent >= 35 ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-green-500/10 border border-green-500/30'}`}>
                        <p className="text-gray-200 text-lg">{result.verdict}</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">* Данный тест является скрининговым и не ставит медицинский диагноз. Для точной диагностики обратитесь к врачу-психиатру.</p>
                    <button onClick={() => { setResult(null); setAnswers(Array(18).fill(null)); }} className="border border-cyan-400 text-cyan-400 px-6 py-2 rounded-lg hover:bg-cyan-400/10">
                        Пройти заново
                    </button>
                </div>
            )}
        </div>
    );
}
