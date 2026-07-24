import { useState, useEffect, useRef } from 'react';
import { saveResult } from '../../lib/helpers';

export function NBackTest({ setTestResults }: any) {
    const [phase, setPhase] = useState<'config' | 'playing' | 'finished'>('config');
    const [nLevel, setNLevel] = useState(2);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [activeCell, setActiveCell] = useState<number | null>(null);
    const [sequence, setSequence] = useState<number[]>([]);
    const [answers, setAnswers] = useState<boolean[]>([]);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [finalAccuracy, setFinalAccuracy] = useState(0);
    
    const totalTrials = 20;

    const startTest = (n: number) => {
        const seq: number[] = [];
        for (let i = 0; i < totalTrials; i++) {
            if (i >= n && Math.random() < 0.3) {
                seq.push(seq[i - n]);
            } else {
                let next = Math.floor(Math.random() * 9);
                if (i >= n && next === seq[i - n]) {
                    next = (next + 1) % 9;
                }
                seq.push(next);
            }
        }
        setSequence(seq);
        setNLevel(n);
        setAnswers([]);
        setCurrentIdx(0);
        setHasAnswered(false);
        setPhase('playing');
    };

    // Игровой цикл
    useEffect(() => {
        if (phase !== 'playing') return;
        
        if (currentIdx >= totalTrials) {
            let hits = 0, correctRejections = 0;
            for (let i = 0; i < totalTrials; i++) {
                const isMatch = i >= nLevel && sequence[i] === sequence[i - nLevel];
                const userSaidMatch = answers[i] || false;
                if (isMatch && userSaidMatch) hits++;
                else if (!isMatch && !userSaidMatch) correctRejections++;
            }
            const accuracy = totalTrials > 0 ? ((hits + correctRejections) / totalTrials) * 100 : 0;
            
            setFinalAccuracy(accuracy);
            saveResult(setTestResults, 'nback', accuracy); // Твоя функция сохранения
            setPhase('finished');
            return;
        }

        setActiveCell(sequence[currentIdx]);
        setHasAnswered(false);
        
        const showTimer = setTimeout(() => setActiveCell(null), 800);
        const nextTimer = setTimeout(() => setCurrentIdx(prev => prev + 1), 1500);

        return () => {
            clearTimeout(showTimer);
            clearTimeout(nextTimer);
        };
    }, [phase, currentIdx, sequence, nLevel, answers, setTestResults]);

    const handleMatch = () => {
        if (phase !== 'playing' || hasAnswered) return;
        setHasAnswered(true);
        setAnswers(prev => {
            const newAnswers = [...prev];
            newAnswers[currentIdx] = true;
            return newAnswers;
        });
    };

    // Пробел для ответа
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.code === 'Space' && phase === 'playing') {
                e.preventDefault();
                handleMatch();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [phase, hasAnswered, currentIdx]);

    if (phase === 'finished') {
        return (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
                <h3 className="text-2xl font-bold text-white mb-4">Тест завершен!</h3>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-2">
                    {finalAccuracy.toFixed(1)}%
                </p>
                <p className="text-gray-400 mb-6 text-center">Точность рабочей памяти. Результат сохранен.</p>
                <button onClick={() => setPhase('config')} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Пройти еще раз
                </button>
            </div>
        );
    }

    if (phase === 'playing') {
        return (
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
                <div className="w-full max-w-md flex justify-between items-center mb-6">
                    <span className="text-gray-400 text-sm">Уровень: <span className="text-white font-bold">{nLevel}-Back</span></span>
                    <span className="text-gray-400 text-sm">Прогресс: <span className="text-white font-bold">{currentIdx} / {totalTrials}</span></span>
                </div>
                
                {/* Сетка 3x3 */}
                <div className="grid grid-cols-3 gap-3 w-64 h-64 mb-8">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`rounded-xl border border-[var(--border)] transition-all duration-150 ${activeCell === i ? 'bg-cyan-400 scale-95 shadow-lg shadow-cyan-400/50' : 'bg-[var(--bg-input)]'}`}></div>
                    ))}
                </div>

                <button 
                    onClick={handleMatch} 
                    className={`w-full max-w-md px-8 py-4 rounded-xl font-bold transition-all duration-150 ${hasAnswered ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-95' : 'bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20'}`}
                >
                    {hasAnswered ? '✓ Отмечено' : 'Совпадение! (или Space)'}
                </button>
            </div>
        );
    }

    // Экран настроек (phase === 'config')
    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <h3 className="text-2xl font-bold text-white mb-4">N-Back Тренировка</h3>
            <p className="text-gray-400 mb-6 text-center max-w-md text-sm">
                На экране будут появляться квадраты. Нажимайте кнопку, если квадрат появился в той же позиции, что и <span className="text-cyan-400 font-bold">N шагов назад</span>.
            </p>
            
            <div className="flex gap-3 mb-8">
                {[2, 3, 4].map(n => (
                    <button key={n} onClick={() => setNLevel(n)}
                        className={`w-16 h-16 rounded-xl border font-bold transition ${nLevel === n ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20' : 'bg-[var(--bg-input)] text-gray-400 border-[var(--border)] hover:text-white'}`}>
                        {n}-Back
                    </button>
                ))}
            </div>

            <button onClick={() => startTest(nLevel)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                Начать тест
            </button>
        </div>
    );
}

export function SchulteTable({ setTestResults, achievements, setAchievements }: any) {
    const [grid, setGrid] = useState<any[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [toast, setToast] = useState('');
    const timerRef = useRef<any>(null);

    const initSchulte = () => {
        const nums = Array.from({length: 25}, (_, i) => i + 1);
        for (let i = nums.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [nums[i], nums[j]] = [nums[j], nums[i]]; }
        setGrid(nums.map(n => ({ value: n, status: 'pending' })));
        setNextNum(1); setTime(0); setIsRunning(true); setIsStopped(false);
    };
    const stopSchulte = () => { setIsRunning(false); setIsStopped(true); setNextNum(26); };

    useEffect(() => {
        if (isRunning) timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const addAchievement = (name: string) => {
        if (!achievements.includes(name)) { setAchievements((prev:any[]) => [...prev, name]); setToast((prev:string) => prev + ` Получена ачивка: "${name}"!`); }
    };

    const handleClick = (index: number, num: number) => {
        if (!isRunning || isStopped) return;
        if (num === nextNum) {
            const newGrid = [...grid]; newGrid[index].status = 'correct'; setGrid(newGrid);
            if (nextNum === 25) {
                setIsRunning(false); const finalTime = time / 1000;
                saveResult(setTestResults, 'schulte', finalTime);
                setToast(`Готово! Время: ${finalTime.toFixed(1)} сек.`);
                if (finalTime < 30) addAchievement("Молния (<30с)");
                else if (finalTime < 45) addAchievement("Снайпер (<45с)");
                else if (finalTime < 60) addAchievement("Стабильность (<60с)");
                setTimeout(() => setToast(''), 5000);
            } else setNextNum(n => n + 1);
        } else {
            const newGrid = [...grid]; newGrid[index].status = 'error'; setGrid(newGrid);
            setTimeout(() => setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c)), 300);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">Смотрите в центр. Находите числа по порядку.</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            <div className="grid grid-cols-5 gap-2 w-[400px] h-[400px] mb-6">
                {grid.length === 0 && <div className="col-span-5 flex items-center justify-center text-gray-600">Нажмите "Начать"</div>}
                {grid.map((cell, i) => (
                    <div key={i} onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        className={`flex items-center justify-center text-2xl font-bold cursor-pointer border rounded transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            isStopped ? 'bg-white/5 border-[var(--border)] text-gray-600 cursor-not-allowed' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>{cell.value}</div>
                ))}
            </div>
            <div className="flex gap-4">
                <button onClick={initSchulte} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{time === 0 ? 'Начать' : 'Начать заново'}</button>
                <button onClick={stopSchulte} disabled={!isRunning} className={`px-8 py-3 rounded-lg font-bold border transition ${isRunning ? 'border-red-500 text-red-500 hover:bg-red-500/10' : 'border-gray-700 text-gray-600 cursor-not-allowed'}`}>Стоп</button>
            </div>
            {toast && <div className="mt-6 bg-green-400/10 border border-green-400 text-green-400 px-6 py-3 rounded-lg text-sm">{toast}</div>}
        </div>
    );
}

export function BreathingExercise() {
    const [phase, setPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale' | 'finished'>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [cycles, setCycles] = useState(0);
    const [targetCycles] = useState(4); // 4 цикла для полного расслабления

    useEffect(() => {
        if (phase === 'idle' || phase === 'finished') return;

        if (timeLeft <= 0) {
            // Переход фаз
            if (phase === 'inhale') {
                setPhase('hold');
                setTimeLeft(7);
            } else if (phase === 'hold') {
                setPhase('exhale');
                setTimeLeft(8);
            } else if (phase === 'exhale') {
                if (cycles + 1 >= targetCycles) {
                    setPhase('finished');
                } else {
                    setCycles(c => c + 1);
                    setPhase('inhale');
                    setTimeLeft(4);
                }
            }
            return;
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, phase, cycles, targetCycles]);

    const startBreathing = () => {
        setCycles(0);
        setPhase('inhale');
        setTimeLeft(4);
    };

    // Настройки анимации в зависимости от фазы
    const circleConfig = {
        inhale: { scale: 1.5, color: 'bg-cyan-400', text: 'Вдох', duration: 4000 },
        hold: { scale: 1.5, color: 'bg-blue-400', text: 'Задержи', duration: 7000 },
        exhale: { scale: 1, color: 'bg-indigo-700', text: 'Выдох', duration: 8000 },
        idle: { scale: 1, color: 'bg-gray-600', text: 'Готов?', duration: 0 },
        finished: { scale: 1, color: 'bg-green-500', text: 'Молодец!', duration: 0 }
    };

    const current = circleConfig[phase];

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center min-h-[60vh]">
            <h3 className="text-2xl font-bold text-white mb-2">Дыхание 4-7-8</h3>
            <p className="text-gray-400 mb-8 text-sm">Техника для снятия тревожности и улучшения сна. Цикл: {cycles}/{targetCycles}</p>
            
            {/* Контейнер для дыхания */}
            <div className="relative flex items-center justify-center w-72 h-72 mb-10">
                {/* Внешний статичный круг */}
                <div className="absolute w-64 h-64 rounded-full border border-[var(--border)] opacity-20"></div>
                
                {/* Анимированный круг */}
                <div 
                    className={`w-48 h-48 rounded-full ${current.color} flex flex-col items-center justify-center shadow-lg transition-all ease-in-out`}
                    style={{ 
                        transform: `scale(${current.scale})`,
                        transitionDuration: `${current.duration}ms` 
                    }}
                >
                    <span className="text-2xl font-bold text-white">{current.text}</span>
                    {phase !== 'idle' && phase !== 'finished' && (
                        <span className="text-5xl font-bold text-white/80 mt-1">{timeLeft}</span>
                    )}
                </div>
            </div>

            {phase === 'finished' ? (
                <div className="text-center">
                    <p className="text-gray-300 mb-4">Сессия завершена. Вы молодец!</p>
                    <button onClick={startBreathing} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                        Начать заново
                    </button>
                </div>
            ) : phase === 'idle' ? (
                <button onClick={startBreathing} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Начать дыхание
                </button>
            ) : (
                <button onClick={() => setPhase('finished')} className="text-gray-500 hover:text-red-400 text-sm underline">
                    Прервать сессию
                </button>
            )}
        </div>
    );
}

export function StroopTest({ setTestResults }: any) {
    const colors = [
        { name: 'КРАСНЫЙ', hex: '#FF5555' },
        { name: 'ЗЕЛЕНЫЙ', hex: '#50FA7B' },
        { name: 'СИНИЙ', hex: '#8BE9FD' },
        { name: 'ЖЕЛТЫЙ', hex: '#F1FA8C' }
    ];
    const [word, setWord] = useState(colors[0]);
    const [color, setColor] = useState(colors[1]);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const timerRef = useRef<any>(null);

    const startGame = () => { setScore(0); setTime(30); setIsPlaying(true); nextRound(); };
    const nextRound = () => {
        const rndWord = colors[Math.floor(Math.random() * colors.length)];
        let rndColor = colors[Math.floor(Math.random() * colors.length)];
        while (rndColor.name === rndWord.name) rndColor = colors[Math.floor(Math.random() * colors.length)];
        setWord(rndWord); setColor(rndColor);
    };

    useEffect(() => {
        if (isPlaying) {
            timerRef.current = setInterval(() => {
                setTime(t => {
                    if (t <= 1) { 
                        clearInterval(timerRef.current); 
                        setIsPlaying(false); 
                        saveResult(setTestResults, 'stroop', score); 
                        return 0; 
                    }
                    return t - 1;
                });
            }, 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isPlaying, score, setTestResults]);

    const handleAnswer = (selectedColorName: string) => {
        if (!isPlaying) return;
        if (selectedColorName === color.name) setScore(s => s + 1);
        else setScore(s => s - 1);
        nextRound();
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4">Нажимайте на ЦВЕТ слова, а не на его значение.</p>
            {!isPlaying && time === 30 && <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">Начать тест (30 сек)</button>}
            
            {isPlaying && (
                <div>
                    <div className="flex gap-8 mb-8 text-2xl">
                        <div>Очки: <span className="text-cyan-400 font-bold">{score}</span></div>
                        <div>Время: <span className="text-pink-400 font-bold">{time}s</span></div>
                    </div>
                    <div className="text-7xl font-extrabold mb-10 text-center" style={{ color: color.hex }}>{word.name}</div>
                    <div className="flex gap-4 flex-wrap justify-center">
                        {colors.map(c => (
                            <button key={c.name} onClick={() => handleAnswer(c.name)} className="px-6 py-3 rounded-xl border border-[var(--border)] hover:bg-white/10 text-lg">{c.name}</button>
                        ))}
                    </div>
                </div>
            )}

            {!isPlaying && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-4">{score}</div>
                    <div className="text-xl text-gray-300 mb-6">Ваш результат</div>
                    <button onClick={startGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>
                </div>
            )}
        </div>
    );
}

export function ReactionTest({ setTestResults }: any) {
    const [state, setState] = useState('idle');
    const [time, setTime] = useState(0);
    const startTime = useRef(0);
    const timerRef = useRef<any>(null);

    const startTest = () => {
        setState('waiting');
        setTime(0);
        const delay = Math.random() * 3000 + 2000; 
        timerRef.current = setTimeout(() => {
            setState('ready');
            startTime.current = Date.now();
        }, delay);
    };

    const handleClick = () => {
        if (state === 'idle' || state === 'result' || state === 'tooSoon') {
            startTest();
        } else if (state === 'waiting') {
            clearTimeout(timerRef.current);
            setState('tooSoon');
        } else if (state === 'ready') {
            const reactionTime = Date.now() - startTime.current;
            setTime(reactionTime);
            setState('result');
            saveResult(setTestResults, 'reaction', reactionTime);
        }
    };

    const bgClass = state === 'ready' ? 'bg-green-500' : state === 'waiting' ? 'bg-red-500' : 'bg-[var(--bg-card)]';
    const text = state === 'idle' ? 'Нажмите, чтобы начать' : 
                 state === 'waiting' ? 'Ждите зеленого...' : 
                 state === 'ready' ? 'КЛИК!' : 
                 state === 'tooSoon' ? 'Рано! Вы кликнули до зеленого цвета.' : `${time} мс`;

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Дождитесь зеленого цвета и кликните как можно быстрее.</p>
            <div onClick={handleClick} className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] transition-colors ${bgClass}`}>
                <span className="text-3xl font-bold text-white text-center px-4">{text}</span>
            </div>
            {state === 'result' && (
                <button onClick={startTest} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Попробовать еще раз
                </button>
            )}
        </div>
    );
}

export function TrailMakingTest({ setTestResults }: any) {
    const targets = ['1','А','2','Б','3','В','4','Г','5','Д','6','Е','7','Ж','8','З'];
    const [grid, setGrid] = useState<any[]>([]);
    const [nextIndex, setNextIndex] = useState(0);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const timerRef = useRef<any>(null);

    const initGame = () => {
        const shuffled = [...targets].sort(() => Math.random() - 0.5);
        setGrid(shuffled.map(t => ({ value: t, status: 'pending' })));
        setNextIndex(0);
        setTime(0);
        setIsRunning(true);
        setIsFinished(false);
    };

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => setTime(t => t + 100), 100);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [isRunning]);

    const handleClick = (index: number, value: string) => {
        if (!isRunning) return;
        const expectedValue = targets[nextIndex];
        
        if (value === expectedValue) {
            const newGrid = [...grid];
            newGrid[index].status = 'correct';
            setGrid(newGrid);
            
            if (nextIndex === targets.length - 1) {
                setIsRunning(false);
                setIsFinished(true);
                saveResult(setTestResults, 'tmt', time / 1000);
            } else {
                setNextIndex(prev => prev + 1);
            }
        } else {
            const newGrid = [...grid];
            newGrid[index].status = 'error';
            setGrid(newGrid);
            setTimeout(() => {
                setGrid(prev => prev.map((c, i) => i === index ? {...c, status: 'pending'} : c));
            }, 300);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4 text-center">Кликайте по очереди: 1 → А → 2 → Б → 3 и т.д.</p>
            <div className="text-3xl font-bold text-cyan-400 mb-6 tabular-nums">{(time / 1000).toFixed(1)}s</div>
            
            {!isRunning && !isFinished && (
                <button onClick={initGame} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg mb-6">Начать тест</button>
            )}
            
            {isFinished && (
                <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-green-400 mb-2">Готово!</div>
                    <div className="text-xl text-gray-300">Ваше время: {(time / 1000).toFixed(1)} сек</div>
                    <button onClick={initGame} className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 py-2 rounded-lg">Заново</button>
                </div>
            )}

            <div className="grid grid-cols-4 gap-3 w-full max-w-md">
                {grid.map((cell, i) => (
                    <div key={i} onClick={() => cell.status === 'pending' && handleClick(i, cell.value)}
                        className={`h-20 flex items-center justify-center text-2xl font-bold cursor-pointer border rounded-lg transition-all ${
                            cell.status === 'correct' ? 'bg-cyan-400/30 border-cyan-400 text-cyan-400' :
                            cell.status === 'error' ? 'bg-red-500/30 border-red-500 text-red-500' :
                            'bg-white/5 border-[var(--border)] hover:bg-white/10'
                        }`}>
                        {cell.value}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DigitSpanTest({ setTestResults }: any) {
    const [level, setLevel] = useState(3);
    const [phase, setPhase] = useState('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [input, setInput] = useState('');
    const [currentIdx, setCurrentIdx] = useState(-1);
    const [message, setMessage] = useState('Нажмите "Начать"');
    const timerRef = useRef<any>(null);

    const startLevel = (lvl: number) => {
        const seq = Array.from({ length: lvl }, () => Math.floor(Math.random() * 10));
        setSequence(seq);
        setInput('');
        setPhase('showing');
        setMessage('Запоминайте...');
        
        let idx = 0;
        const showNext = () => {
            setCurrentIdx(idx);
            idx++;
            if (idx < seq.length) {
                timerRef.current = setTimeout(showNext, 800);
            } else {
                timerRef.current = setTimeout(() => {
                    setPhase('input');
                    setMessage('Введите последовательность');
                    setCurrentIdx(-1);
                }, 800);
            }
        };
        timerRef.current = setTimeout(showNext, 1000);
    };

    const checkAnswer = () => {
        const correct = sequence.join('');
        if (input === correct) {
            setMessage(`Верно! Переходим на уровень ${level + 1}.`);
            setPhase('result');
            saveResult(setTestResults, 'digitspan', level);
            setLevel(l => l + 1);
        } else {
            setMessage(`Неверно. Было: ${correct}. Начинаем заново с 3.`);
            setPhase('result');
            if(level > 3) saveResult(setTestResults, 'digitspan', level - 1);
            setLevel(3);
        }
    };

    useEffect(() => () => clearTimeout(timerRef.current), []);

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Запомните последовательность чисел и введите её в правильном порядке.</p>
            <div className="text-xl text-cyan-400 mb-6">Уровень: {level}</div>
            
            <div className="w-full max-w-md h-32 flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] mb-8">
                {phase === 'showing' && currentIdx >= 0 ? (
                    <span className="text-7xl font-bold text-white">{sequence[currentIdx]}</span>
                ) : (
                    <span className="text-xl text-gray-400">{message}</span>
                )}
            </div>

            {phase === 'input' && (
                <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value.replace(/[^0-9]/g, ''))} 
                        className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 text-center text-2xl outline-none focus:border-cyan-400 text-white tracking-widest"
                        autoFocus
                    />
                    <button onClick={checkAnswer} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg w-full">Проверить</button>
                </div>
            )}

            {(phase === 'idle' || phase === 'result') && (
                <button onClick={() => startLevel(level)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    {phase === 'idle' ? 'Начать' : 'Продолжить'}
                </button>
            )}
        </div>
    );
}

export function GoNoGoTest({ setTestResults }: any) {
    const [phase, setPhase] = useState('idle');
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [stimulus, setStimulus] = useState('none');
    const timerRef = useRef<any>(null);
    const stimulusRef = useRef<any>(null);

    const startGame = () => {
        setScore(0);
        setTime(30);
        setPhase('playing');
        nextStimulus();
    };

    const nextStimulus = () => {
        setStimulus('none');
        const delay = Math.random() * 1000 + 800;
        stimulusRef.current = setTimeout(() => {
            const type = Math.random() < 0.75 ? 'go' : 'nogo';
            setStimulus(type);
            
            stimulusRef.current = setTimeout(() => {
                if (type === 'go') {
                    setScore(s => s - 1); // Пропустил зеленый
                }
                nextStimulus();
            }, 1200);
        }, delay);
    };

    const handleClick = () => {
        if (phase !== 'playing') return;
        if (stimulus === 'go') {
            setScore(s => s + 1);
            clearTimeout(stimulusRef.current);
            nextStimulus();
        } else if (stimulus === 'nogo') {
            setScore(s => s - 2); // Нажал красный
            setStimulus('error');
            clearTimeout(stimulusRef.current);
            setTimeout(() => nextStimulus(), 500);
        }
    };

    useEffect(() => {
        if (phase === 'playing') {
            timerRef.current = setInterval(() => {
                setTime(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        clearTimeout(stimulusRef.current);
                        setPhase('gameover');
                        setStimulus('none');
                        saveResult(setTestResults, 'gonogo', score);
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }
        return () => {
            clearInterval(timerRef.current);
            clearTimeout(stimulusRef.current);
        };
    }, [phase, score, setTestResults]);

    // Классы для круга в центре
    const circleClass = stimulus === 'go' ? 'bg-green-500' : 
                        stimulus === 'nogo' ? 'bg-red-500' : 
                        stimulus === 'error' ? 'bg-red-700 border-4 border-red-300' :
                        'bg-transparent';

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Кликайте только на <span className="text-green-400 font-bold">зеленый</span> круг. При <span className="text-red-400 font-bold">красном</span> не нажимайте ничего!</p>
            
            {phase === 'playing' && (
                <div className="flex gap-8 mb-8 text-2xl">
                    <div>Очки: <span className="text-cyan-400 font-bold">{score}</span></div>
                    <div>Время: <span className="text-pink-400 font-bold">{time}s</span></div>
                </div>
            )}

            <div onClick={handleClick} className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] bg-[var(--bg-card)] transition-colors duration-150 ${phase !== 'playing' ? 'cursor-default' : ''}`}>
                {phase === 'idle' && <span className="text-3xl font-bold text-white">Нажмите "Старт"</span>}
                {phase === 'gameover' && (
                    <div className="text-center">
                        <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                        <div className="text-xl text-gray-300">Ваш результат</div>
                    </div>
                )}
                {phase === 'playing' && stimulus === 'none' && <span className="text-3xl font-bold text-white opacity-0">...</span>}
                {phase === 'playing' && (stimulus === 'go' || stimulus === 'nogo' || stimulus === 'error') && (
                    <div className={`w-40 h-40 rounded-full transition-all duration-100 flex items-center justify-center ${circleClass}`}>
                        {stimulus === 'error' && <span className="text-3xl font-bold text-white">ОЙ!</span>}
                    </div>
                )}
            </div>

            {phase === 'idle' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Старт</button>}
            {phase === 'gameover' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>}
        </div>
    );
}

export function PomodoroTimer() {
    const workDurations = [5, 10, 15, 20, 25, 30];
    const [workTime, setWorkTime] = useState(25);
    const [mode, setMode] = useState('work');
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const timerRef = useRef<any>(null);
    const changeDuration = (mins: number) => { setIsRunning(false); setMode('work'); setWorkTime(mins); setTimeLeft(mins * 60); };

    useEffect(() => {
        if (isRunning) {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) { clearInterval(timerRef.current); setIsRunning(false); const nextMode = mode === 'work' ? 'break' : 'work'; setMode(nextMode); return nextMode === 'work' ? workTime * 60 : 5 * 60; }
                    return t - 1;
                });
            }, 1000);
        } else clearInterval(timerRef.current);
        return () => clearInterval(timerRef.current);
    }, [isRunning, mode, workTime]);

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <div className="flex gap-2 mb-6 flex-wrap justify-center">
                {workDurations.map(m => (
                    <button key={m} onClick={() => changeDuration(m)} className={`px-4 py-1 rounded-lg text-sm transition ${workTime === m && mode === 'work' ? 'bg-cyan-400 text-black font-bold' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-[var(--border)]'}`}>{m} мин</button>
                ))}
            </div>
            <div className={`text-2xl mb-4 font-semibold ${mode === 'work' ? 'text-cyan-400' : 'text-green-400'}`}>{mode === 'work' ? 'Время фокусироваться' : 'Перерыв'}</div>
            <div className="text-8xl font-bold mb-8 tabular-nums">{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</div>
            <div className="flex gap-4">
                <button onClick={() => setIsRunning(!isRunning)} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{isRunning ? 'Пауза' : 'Старт'}</button>
                <button onClick={() => { setIsRunning(false); setMode('work'); setTimeLeft(workTime * 60); }} className="border border-[var(--border)] text-gray-400 px-8 py-3 rounded-lg hover:bg-white/5">Сброс</button>
            </div>
            <input type="text" placeholder="Введите ОДНУ задачу сюда..." className="mt-8 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 w-full max-w-md text-center text-lg outline-none focus:border-cyan-400" />
        </div>
    );
}
