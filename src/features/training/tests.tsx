import { useState, useEffect, useRef } from 'react';
import { saveResult } from '../../lib/helpers';
import { Icon } from '../../components/Icons';
import type { Pomodoro } from '../../stores/app-ui.store';
import type { Setter, ExerciseProps, ScoredExerciseProps } from '../../types/props';
import type { FormEvent } from 'react';
import { randomOf, type NonEmptyArray } from '../../lib/nonEmpty';

export function NBackTest({ setTestResults }: ExerciseProps) {
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
            const lookback = i >= n ? seq[i - n] : undefined;
            if (lookback !== undefined && Math.random() < 0.3) {
                seq.push(lookback);
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
            // Only credit trials the user actually judged: a hit is a match they
            // caught, a false alarm is pressing on a non-match. Silently letting
            // non-match trials pass by is not an answer, so it earns nothing —
            // otherwise doing nothing at all would still score close to 100%.
            let matches = 0, hits = 0, falseAlarms = 0;
            for (let i = 0; i < totalTrials; i++) {
                const isMatch = i >= nLevel && sequence[i] === sequence[i - nLevel];
                const userSaidMatch = answers[i] || false;
                if (isMatch) {
                    matches++;
                    if (userSaidMatch) hits++;
                } else if (userSaidMatch) {
                    falseAlarms++;
                }
            }
            const accuracy = matches > 0 ? Math.max(0, ((hits - falseAlarms) / matches) * 100) : 0;

            setFinalAccuracy(accuracy);
            saveResult(setTestResults, 'nback', accuracy); // Твоя функция сохранения
            setPhase('finished');
            return;
        }

        setActiveCell(sequence[currentIdx] ?? null);
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
                    className={`w-full max-w-md px-8 py-4 rounded-xl font-bold transition-all duration-150 flex items-center justify-center gap-2 ${hasAnswered ? 'bg-green-500/20 text-green-400 border border-green-500/30 scale-95' : 'bg-purple-400/10 text-purple-400 border border-purple-400/20 hover:bg-purple-400/20'}`}
                >
                    {hasAnswered ? <><Icon name="check" size={16} /> Отмечено</> : 'Совпадение! (или Space)'}
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

export function SchulteTable({ setTestResults, achievements, setAchievements }: ScoredExerciseProps) {
    const [grid, setGrid] = useState<any[]>([]);
    const [nextNum, setNextNum] = useState(1);
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isStopped, setIsStopped] = useState(false);
    const [toast, setToast] = useState('');
    const timerRef = useRef<any>(null);

    const initSchulte = () => {
        const nums = Array.from({length: 25}, (_, i) => i + 1);
        // Fisher-Yates. Both indices are in range by construction, but the
        // compiler cannot see that, so read them out before swapping.
        for (let i = nums.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const a = nums[i], b = nums[j];
            if (a === undefined || b === undefined) continue;
            nums[i] = b; nums[j] = a;
        }
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

type BreathPhase = 'idle' | 'inhale' | 'hold1' | 'exhale' | 'hold2' | 'finished';

export function BreathingExercise() {
    const [phase, setPhase] = useState<BreathPhase>('idle');
    const [timeLeft, setTimeLeft] = useState(0);
    const [cycles, setCycles] = useState(0);
    const targetCycles = 4;
    const secondsPerSide = 4; // квадратное дыхание 4-4-4-4

    useEffect(() => {
        if (phase === 'idle' || phase === 'finished') return;

        if (timeLeft <= 0) {
            if (phase === 'inhale') { setPhase('hold1'); setTimeLeft(secondsPerSide); }
            else if (phase === 'hold1') { setPhase('exhale'); setTimeLeft(secondsPerSide); }
            else if (phase === 'exhale') { setPhase('hold2'); setTimeLeft(secondsPerSide); }
            else if (phase === 'hold2') {
                if (cycles + 1 >= targetCycles) { setPhase('finished'); }
                else { setCycles(c => c + 1); setPhase('inhale'); setTimeLeft(secondsPerSide); }
            }
            return;
        }

        const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
        return () => clearTimeout(timer);
    }, [timeLeft, phase, cycles]);

    const start = () => { setCycles(0); setPhase('inhale'); setTimeLeft(secondsPerSide); };

    // The indicator travels one side of the square per phase (clockwise from the
    // bottom-left corner). `to` is the corner it animates toward this phase.
    const SIDE = 260;                       // square side in px
    const corners = {
        bl: { left: 0, top: SIDE },
        tl: { left: 0, top: 0 },
        tr: { left: SIDE, top: 0 },
        br: { left: SIDE, top: SIDE },
    };
    const config: Record<BreathPhase, { to: keyof typeof corners; label: string; accent: string }> = {
        idle:     { to: 'bl', label: 'Готов?',   accent: 'var(--text-muted)' },
        inhale:   { to: 'tl', label: 'Вдох',     accent: 'var(--accent-cyan)' },
        hold1:    { to: 'tr', label: 'Задержи',  accent: 'var(--accent-purple)' },
        exhale:   { to: 'br', label: 'Выдох',    accent: 'var(--accent-pink)' },
        hold2:    { to: 'bl', label: 'Задержи',  accent: 'var(--accent-purple)' },
        finished: { to: 'bl', label: 'Готово!',  accent: '#22c55e' },
    };
    const active = config[phase];
    const dot = corners[active.to];
    const moving = phase !== 'idle' && phase !== 'finished';
    // Which side is currently lit (the one the dot travels along).
    const litSide = phase; // 'inhale'|'hold1'|'exhale'|'hold2'

    const sideStyle = (name: BreathPhase, on: boolean) => ({
        background: litSide === name && on ? active.accent : 'var(--border)',
        boxShadow: litSide === name && on ? `0 0 12px ${active.accent}` : 'none',
        transition: 'background 0.3s ease, box-shadow 0.3s ease',
    });

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center justify-center min-h-[60vh]">
            <h3 className="text-2xl font-bold text-white mb-2">Квадратное дыхание (4-4-4-4)</h3>
            <p className="text-gray-400 mb-10 text-sm text-center">Веди дыхание по сторонам квадрата: вдох, задержка, выдох, задержка. Цикл: {cycles}/{targetCycles}</p>

            <div className="relative mb-10" style={{ width: SIDE, height: SIDE }}>
                {/* Square edges (light up on the active side) */}
                <div className="absolute rounded-full" style={{ left: 0, top: 0, width: 4, height: SIDE, transform: 'translateX(-2px)', ...sideStyle('inhale', moving) }} />
                <div className="absolute rounded-full" style={{ left: 0, top: 0, width: SIDE, height: 4, transform: 'translateY(-2px)', ...sideStyle('hold1', moving) }} />
                <div className="absolute rounded-full" style={{ left: SIDE, top: 0, width: 4, height: SIDE, transform: 'translateX(-2px)', ...sideStyle('exhale', moving) }} />
                <div className="absolute rounded-full" style={{ left: 0, top: SIDE, width: SIDE, height: 4, transform: 'translateY(-2px)', ...sideStyle('hold2', moving) }} />

                {/* Center label + countdown */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold" style={{ color: active.accent }}>{active.label}</span>
                    {moving && <span className="text-6xl font-bold text-white/80 mt-1 tabular-nums">{timeLeft}</span>}
                </div>

                {/* Travelling indicator */}
                <div
                    className={moving ? 'breath-dot' : ''}
                    style={{
                        position: 'absolute',
                        width: 22, height: 22, borderRadius: '9999px',
                        background: active.accent,
                        left: dot.left, top: dot.top,
                        transform: 'translate(-50%, -50%)',
                        transition: moving ? `left ${secondsPerSide}s linear, top ${secondsPerSide}s linear` : 'none',
                    }}
                />
            </div>

            {phase === 'finished' ? (
                <div className="text-center">
                    <p className="text-gray-300 mb-4">Сессия завершена. Ты молодец! 🌿</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать заново</button>
                </div>
            ) : phase === 'idle' ? (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать дыхание</button>
            ) : (
                <button onClick={() => setPhase('finished')} className="text-gray-500 hover:text-red-400 text-sm underline">Прервать сессию</button>
            )}
        </div>
    );
}

export function StroopTest({ setTestResults }: ExerciseProps) {
    const colors: NonEmptyArray<{ name: string; hex: string }> = [
        { name: 'КРАСНЫЙ', hex: '#FF5555' },
        { name: 'ЗЕЛЕНЫЙ', hex: '#50FA7B' },
        { name: 'СИНИЙ', hex: '#8BE9FD' },
        { name: 'ЖЕЛТЫЙ', hex: '#F1FA8C' },
    ];
    const [word, setWord] = useState(colors[0]);
    const [color, setColor] = useState(colors[1] ?? colors[0]);
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [isPlaying, setIsPlaying] = useState(false);
    const timerRef = useRef<any>(null);

    const startGame = () => { setScore(0); setTime(30); setIsPlaying(true); nextRound(); };
    const nextRound = () => {
        // The ink colour must differ from the word, or there is no interference
        // to measure — that difference is the whole task.
        const rndWord = randomOf(colors);
        let rndColor = randomOf(colors);
        while (rndColor.name === rndWord.name) rndColor = randomOf(colors);
        setWord(rndWord); setColor(rndColor);
    };

    const scoreRef = useRef(0);
    useEffect(() => { scoreRef.current = score; }, [score]);

    // Keyed on isPlaying only — depending on `score` here restarted the
    // interval on every click (a fresh answer resets `score`), which kept
    // clearing the running timer before it ever ticked down.
    useEffect(() => {
        if (!isPlaying) return;
        timerRef.current = setInterval(() => {
            setTime(t => (t <= 1 ? 0 : t - 1));
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [isPlaying]);

    useEffect(() => {
        if (isPlaying && time <= 0) {
            setIsPlaying(false);
            saveResult(setTestResults, 'stroop', scoreRef.current);
        }
    }, [time, isPlaying, setTestResults]);

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

export function ReactionTest({ setTestResults, achievements, setAchievements }: ScoredExerciseProps) {
    const [state, setState] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'tooSoon'>('idle');
    const [time, setTime] = useState(0);
    const [best, setBest] = useState<number | null>(null);
    const [toast, setToast] = useState('');
    const startTime = useRef(0);
    const timerRef = useRef<any>(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const addAchievement = (name: string) => {
        if (Array.isArray(achievements) && !achievements.includes(name)) {
            setAchievements(prev => [...prev, name]);
            setToast(`Ачивка: «${name}»!`);
            setTimeout(() => setToast(''), 4000);
        }
    };

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
            const rt = Date.now() - startTime.current;
            setTime(rt);
            setState('result');
            saveResult(setTestResults, 'reaction', rt);
            if (best === null || rt < best) setBest(rt);
            if (rt < 200) addAchievement('Сверхреакция (<200 мс)');
            else if (rt < 250) addAchievement('Молния (<250 мс)');
            else if (rt < 300) addAchievement('Быстрая рука (<300 мс)');
        }
    };

    const rating = time < 200 ? 'Невероятно! ⚡' : time < 250 ? 'Молниеносно' : time < 300 ? 'Отлично' : time < 400 ? 'Хорошо' : 'Есть куда расти';

    const bgClass = state === 'ready' ? 'bg-green-500' : state === 'waiting' ? 'bg-red-500/90' : state === 'tooSoon' ? 'bg-orange-500/80' : 'bg-[var(--bg-card)]';

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-4 text-center">Дождись зелёного цвета и кликни как можно быстрее.</p>
            {best !== null && <div className="text-sm text-gray-400 mb-4">Лучший результат за сессию: <span className="text-cyan-400 font-bold">{best} мс</span></div>}

            <div onClick={handleClick} className={`relative w-full max-w-md h-64 flex items-center justify-center rounded-2xl cursor-pointer border-2 border-[var(--border)] overflow-hidden transition-colors duration-150 ${bgClass}`}>
                {/* waiting: pulsing dots */}
                {state === 'waiting' && (
                    <div className="flex flex-col items-center gap-3">
                        <div className="flex gap-2">
                            {[0, 1, 2].map(i => (
                                <span key={i} className="w-3 h-3 rounded-full bg-white/80 animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                        </div>
                        <span className="text-2xl font-bold text-white">Ждите зелёного…</span>
                    </div>
                )}
                {state === 'ready' && (
                    <span key="go" style={{ animation: 'popIn 0.15s ease-out' }} className="text-5xl font-extrabold text-white">КЛИК!</span>
                )}
                {state === 'idle' && <span className="text-3xl font-bold text-white text-center px-4">Нажмите, чтобы начать</span>}
                {state === 'tooSoon' && <span className="text-2xl font-bold text-white text-center px-4">Рано! Дождись зелёного 🙂</span>}
                {state === 'result' && (
                    <div key={time} className="text-center" style={{ animation: 'popIn 0.25s ease-out' }}>
                        <div className="text-6xl font-extrabold text-white tabular-nums">{time}<span className="text-2xl"> мс</span></div>
                        <div className="text-lg text-white/90 mt-2">{rating}</div>
                    </div>
                )}
            </div>

            {state === 'result' && (
                <button onClick={startTest} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">
                    Попробовать ещё раз
                </button>
            )}

            {toast && (
                <div className="mt-6 bg-green-400/10 border border-green-400 text-green-400 px-6 py-3 rounded-lg text-sm flex items-center gap-2">
                    <Icon name="trophy" size={16} />
                    {toast}
                </div>
            )}
        </div>
    );
}

export function TrailMakingTest({ setTestResults }: ExerciseProps) {
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

export function DigitSpanTest({ setTestResults }: ExerciseProps) {
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

export function GoNoGoTest({ setTestResults }: ExerciseProps) {
    const [phase, setPhase] = useState<'idle' | 'playing' | 'gameover'>('idle');
    const [score, setScore] = useState(0);
    const [time, setTime] = useState(30);
    const [stimulus, setStimulus] = useState<'none' | 'go' | 'nogo' | 'error'>('none');
    const scoreRef = useRef(0);
    const stimulusRef = useRef<any>(null);

    // Keep a ref of the score so the countdown effect can read the final value
    // without depending on `score` (which would tear down the stimulus loop).
    useEffect(() => { scoreRef.current = score; }, [score]);

    const nextStimulus = () => {
        setStimulus('none');
        const delay = Math.random() * 1000 + 800;
        stimulusRef.current = setTimeout(() => {
            const type = Math.random() < 0.72 ? 'go' : 'nogo';
            setStimulus(type);
            stimulusRef.current = setTimeout(() => {
                if (type === 'go') setScore(s => s - 1); // прозевал зелёный
                nextStimulus();
            }, 1100);
        }, delay);
    };

    const startGame = () => {
        setScore(0);
        setTime(30);
        setStimulus('none');
        setPhase('playing');
    };

    const handleClick = () => {
        if (phase !== 'playing') return;
        if (stimulus === 'go') {
            setScore(s => s + 1);
            clearTimeout(stimulusRef.current);
            nextStimulus();
        } else if (stimulus === 'nogo') {
            setScore(s => s - 2); // нажал на красный
            setStimulus('error');
            clearTimeout(stimulusRef.current);
            setTimeout(() => nextStimulus(), 500);
        }
    };

    // Stimulus loop — keyed on phase only, so score changes (and StrictMode's
    // double-invoke) can't cancel the pending circle.
    useEffect(() => {
        if (phase !== 'playing') return;
        nextStimulus();
        return () => clearTimeout(stimulusRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phase]);

    // Countdown — keyed on phase only. The updater stays pure (just decrements);
    // ending the game is handled by the separate effect below.
    useEffect(() => {
        if (phase !== 'playing') return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [phase]);

    // Game over when the clock hits zero (no state updates inside an updater).
    useEffect(() => {
        if (phase === 'playing' && time <= 0) {
            clearTimeout(stimulusRef.current);
            setStimulus('none');
            saveResult(setTestResults, 'gonogo', scoreRef.current);
            setPhase('gameover');
        }
    }, [time, phase, setTestResults]);

    const circleClass = stimulus === 'go' ? 'bg-green-500 shadow-lg shadow-green-500/40' :
                        stimulus === 'nogo' ? 'bg-red-500 shadow-lg shadow-red-500/40' :
                        stimulus === 'error' ? 'bg-red-700 border-4 border-red-300' : '';

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Кликайте только на <span className="text-green-400 font-bold">зелёный</span> круг. При <span className="text-red-400 font-bold">красном</span> — не нажимайте ничего!</p>

            {phase === 'playing' && (
                <div className="flex gap-8 mb-8 text-2xl">
                    <div>Очки: <span className="text-cyan-400 font-bold">{score}</span></div>
                    <div>Время: <span className="text-pink-400 font-bold">{time}s</span></div>
                </div>
            )}

            <div onClick={handleClick} className={`w-full max-w-md h-64 flex items-center justify-center rounded-2xl border-2 border-[var(--border)] bg-[var(--bg-card)] transition-colors duration-150 ${phase === 'playing' ? 'cursor-pointer' : 'cursor-default'}`}>
                {phase === 'idle' && <span className="text-3xl font-bold text-white">Нажмите «Старт»</span>}
                {phase === 'gameover' && (
                    <div className="text-center">
                        <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                        <div className="text-xl text-gray-300">Ваш результат</div>
                    </div>
                )}
                {phase === 'playing' && (stimulus === 'go' || stimulus === 'nogo' || stimulus === 'error') && (
                    <div key={stimulus + time} style={{ animation: 'popIn 0.15s ease-out' }}
                        className={`w-40 h-40 rounded-full flex items-center justify-center ${circleClass}`}>
                        {stimulus === 'error' && <span className="text-3xl font-bold text-white">ОЙ!</span>}
                    </div>
                )}
            </div>

            {phase === 'idle' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Старт</button>}
            {phase === 'gameover' && <button onClick={startGame} className="mt-8 bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>}
        </div>
    );
}

/**
 * The countdown itself is driven by PomodoroTicker in the app shell, so it keeps
 * running when this tab unmounts — this component is just the dial and controls.
 */
export function PomodoroTimer({ pomodoro, setPomodoro }: { pomodoro: Pomodoro; setPomodoro: Setter<Pomodoro> }) {
    const workDurations = [5, 10, 15, 20, 25, 30];
    const { workTime, mode, timeLeft, isRunning } = pomodoro;

    const changeDuration = (mins: number) => setPomodoro({ workTime: mins, mode: 'work', timeLeft: mins * 60, isRunning: false });
    const toggleRun = () => setPomodoro((p) => ({ ...p, isRunning: !p.isRunning }));
    const reset = () => setPomodoro((p) => ({ ...p, isRunning: false, mode: 'work', timeLeft: p.workTime * 60 }));

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
                <button onClick={toggleRun} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">{isRunning ? 'Пауза' : 'Старт'}</button>
                <button onClick={reset} className="border border-[var(--border)] text-gray-400 px-8 py-3 rounded-lg hover:bg-white/5">Сброс</button>
            </div>
            <input type="text" placeholder="Введите ОДНУ задачу сюда..." className="mt-8 bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 w-full max-w-md text-center text-lg outline-none focus:border-cyan-400" />
        </div>
    );
}

/**
 * Corsi block-tapping — visuospatial working memory. Complements Digit Span,
 * which is verbal: the two often diverge sharply in ADHD.
 */
export function CorsiTest({ setTestResults }: ExerciseProps) {
    const [phase, setPhase] = useState<'idle' | 'showing' | 'input' | 'over'>('idle');
    const [sequence, setSequence] = useState<number[]>([]);
    const [entered, setEntered] = useState<number[]>([]);
    const [lit, setLit] = useState<number | null>(null);
    const [span, setSpan] = useState(2);
    const [best, setBest] = useState(0);
    const timers = useRef<any[]>([]);

    const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
    useEffect(() => clearTimers, []);

    const playSequence = (seq: number[]) => {
        setPhase('showing');
        setEntered([]);
        clearTimers();
        seq.forEach((cell, i) => {
            timers.current.push(setTimeout(() => setLit(cell), i * 800));
            timers.current.push(setTimeout(() => setLit(null), i * 800 + 500));
        });
        timers.current.push(setTimeout(() => setPhase('input'), seq.length * 800));
    };

    const startRound = (length: number) => {
        const seq: number[] = [];
        while (seq.length < length) {
            const n = Math.floor(Math.random() * 9);
            if (seq[seq.length - 1] !== n) seq.push(n); // never flash the same cell twice running
        }
        setSequence(seq);
        setSpan(length);
        playSequence(seq);
    };

    const start = () => { setBest(0); startRound(2); };

    const tap = (cell: number) => {
        if (phase !== 'input') return;
        const next = [...entered, cell];
        setEntered(next);

        if (sequence[next.length - 1] !== cell) {          // a wrong tap ends the run
            const reached = Math.max(span - 1, 0);
            setBest(reached);
            saveResult(setTestResults, 'corsi', reached);
            setPhase('over');
            return;
        }
        if (next.length === sequence.length) {              // whole sequence repeated
            setBest(span);
            timers.current.push(setTimeout(() => startRound(span + 1), 700));
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-2 text-center">Запомни порядок вспышек и повтори его, нажимая на квадраты.</p>
            <div className="flex gap-6 mb-6 text-sm">
                <span className="text-gray-400">Длина: <b className="text-cyan-400">{span}</b></span>
                <span className="text-gray-400">Лучшее: <b className="text-purple-400">{best}</b></span>
            </div>

            <div className="grid grid-cols-3 gap-3 w-72 h-72 mb-6">
                {Array.from({ length: 9 }).map((_, i) => (
                    <button key={i} onClick={() => tap(i)} disabled={phase !== 'input'}
                        className={`rounded-xl border transition-all duration-100 ${
                            lit === i ? 'bg-cyan-400 border-cyan-400 scale-95 shadow-lg shadow-cyan-400/50'
                                : entered.includes(i) && phase === 'input' ? 'bg-purple-400/30 border-purple-400'
                                : 'bg-[var(--bg-input)] border-[var(--border)]'
                        } ${phase === 'input' ? 'cursor-pointer hover:border-cyan-400/60' : 'cursor-default'}`} />
                ))}
            </div>

            {phase === 'idle' && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать</button>
            )}
            {phase === 'showing' && <p className="text-cyan-400 text-sm animate-pulse">Смотри внимательно…</p>}
            {phase === 'input' && <p className="text-gray-400 text-sm">Повтори: {entered.length} / {sequence.length}</p>}
            {phase === 'over' && (
                <div className="text-center">
                    <div className="text-4xl font-bold text-cyan-400 mb-1">{best}</div>
                    <p className="text-gray-400 mb-4 text-sm">Максимальная длина последовательности</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Ещё раз</button>
                </div>
            )}
        </div>
    );
}

/** Mental arithmetic against the clock — processing speed under mild pressure. */
export function ArithmeticTest({ setTestResults }: ExerciseProps) {
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(60);
    const [score, setScore] = useState(0);
    const [task, setTask] = useState<{ text: string; answer: number } | null>(null);
    const [input, setInput] = useState('');
    const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
    const scoreRef = useRef(0);

    useEffect(() => { scoreRef.current = score; }, [score]);

    const makeTask = () => {
        const ops = ['+', '−', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a: number, b: number, answer: number;
        if (op === '×') { a = 2 + Math.floor(Math.random() * 11); b = 2 + Math.floor(Math.random() * 11); answer = a * b; }
        else if (op === '+') { a = 10 + Math.floor(Math.random() * 80); b = 10 + Math.floor(Math.random() * 80); answer = a + b; }
        else { a = 20 + Math.floor(Math.random() * 80); b = 5 + Math.floor(Math.random() * 40); answer = a - b; }
        setTask({ text: `${a} ${op} ${b}`, answer });
    };

    const start = () => { setScore(0); setTime(60); setInput(''); setPlaying(true); makeTask(); };

    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [playing]);

    // Ending lives in its own effect, so no state update happens inside the timer updater.
    useEffect(() => {
        if (playing && time <= 0) {
            setPlaying(false);
            saveResult(setTestResults, 'arithmetic', scoreRef.current);
        }
    }, [time, playing, setTestResults]);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (!playing || !task || input === '') return;
        const correct = Number(input) === task.answer;
        setScore(s => (correct ? s + 1 : Math.max(0, s - 1)));
        setFlash(correct ? 'ok' : 'bad');
        setTimeout(() => setFlash(null), 250);
        setInput('');
        makeTask();
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Считай в уме как можно быстрее. За ошибку —1 балл.</p>

            {!playing && time === 60 && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать (60 сек)</button>
            )}

            {playing && task && (
                <>
                    <div className="flex gap-8 mb-6 text-xl">
                        <span>Очки: <b className="text-cyan-400">{score}</b></span>
                        <span>Время: <b className="text-pink-400">{time}s</b></span>
                    </div>
                    <div className={`text-6xl font-extrabold mb-6 transition-colors ${
                        flash === 'ok' ? 'text-green-400' : flash === 'bad' ? 'text-red-400' : 'text-white'
                    }`}>
                        {task.text}
                    </div>
                    <form onSubmit={submit}>
                        <input autoFocus type="number" value={input} onChange={e => setInput(e.target.value)}
                            className="bg-[var(--bg-input)] border-2 border-[var(--border)] rounded-xl px-6 py-3 text-3xl text-center w-48 outline-none focus:border-cyan-400 text-white" />
                    </form>
                    <p className="text-xs text-gray-500 mt-3">Enter — ответить</p>
                </>
            )}

            {!playing && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                    <p className="text-gray-400 mb-6">Правильных ответов за минуту</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>
                </div>
            )}
        </div>
    );
}

/**
 * Task switching — the rule flips between "is the number even?" and "is the
 * colour warm?", which makes the cost of switching sets visible.
 */
export function SwitchingTest({ setTestResults }: ExerciseProps) {
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(45);
    const [score, setScore] = useState(0);
    const [rule, setRule] = useState<'parity' | 'colour'>('parity');
    const [card, setCard] = useState<{ n: number; warm: boolean } | null>(null);
    const [flash, setFlash] = useState<'ok' | 'bad' | null>(null);
    const scoreRef = useRef(0);

    useEffect(() => { scoreRef.current = score; }, [score]);

    const nextCard = () => {
        setCard({ n: 1 + Math.floor(Math.random() * 9), warm: Math.random() < 0.5 });
        // Flip the rule on roughly a third of trials — that is where the cost shows.
        if (Math.random() < 0.35) setRule(r => (r === 'parity' ? 'colour' : 'parity'));
    };

    const start = () => { setScore(0); setTime(45); setRule('parity'); setPlaying(true); nextCard(); };

    useEffect(() => {
        if (!playing) return;
        const id = setInterval(() => setTime(t => (t <= 1 ? 0 : t - 1)), 1000);
        return () => clearInterval(id);
    }, [playing]);

    useEffect(() => {
        if (playing && time <= 0) {
            setPlaying(false);
            saveResult(setTestResults, 'switching', scoreRef.current);
        }
    }, [time, playing, setTestResults]);

    const answer = (yes: boolean) => {
        if (!playing || !card) return;
        const truth = rule === 'parity' ? card.n % 2 === 0 : card.warm;
        const correct = yes === truth;
        setScore(s => (correct ? s + 1 : Math.max(0, s - 1)));
        setFlash(correct ? 'ok' : 'bad');
        setTimeout(() => setFlash(null), 200);
        nextCard();
    };

    return (
        <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <p className="text-gray-400 mb-6 text-center">Правило меняется на ходу — следи за подсказкой сверху.</p>

            {!playing && time === 45 && (
                <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Начать (45 сек)</button>
            )}

            {playing && card && (
                <>
                    <div className="flex gap-8 mb-4 text-lg">
                        <span>Очки: <b className="text-cyan-400">{score}</b></span>
                        <span>Время: <b className="text-pink-400">{time}s</b></span>
                    </div>

                    <div key={rule} style={{ animation: 'popIn 0.2s ease-out' }}
                        className="mb-6 px-5 py-2 rounded-xl bg-purple-400/15 border border-purple-400/40 text-purple-400 font-bold">
                        {rule === 'parity' ? 'Правило: число ЧЁТНОЕ?' : 'Правило: цвет ТЁПЛЫЙ?'}
                    </div>

                    <div className={`w-40 h-40 rounded-2xl flex items-center justify-center text-7xl font-extrabold mb-8 ${
                        flash === 'ok' ? 'ring-4 ring-green-400' : flash === 'bad' ? 'ring-4 ring-red-400' : ''
                    }`} style={{ background: card.warm ? '#EA580C' : '#0284C7', color: '#fff' }}>
                        {card.n}
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => answer(true)}
                            className="px-10 py-3 rounded-xl border border-green-400/50 text-green-400 hover:bg-green-400/10 font-bold transition">Да</button>
                        <button onClick={() => answer(false)}
                            className="px-10 py-3 rounded-xl border border-red-400/50 text-red-400 hover:bg-red-400/10 font-bold transition">Нет</button>
                    </div>
                </>
            )}

            {!playing && time === 0 && (
                <div className="text-center">
                    <div className="text-5xl font-bold text-cyan-400 mb-2">{score}</div>
                    <p className="text-gray-400 mb-6">Очков за 45 секунд</p>
                    <button onClick={start} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-8 py-3 rounded-lg">Играть снова</button>
                </div>
            )}
        </div>
    );
}
