import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { DISTRACTION_IDS, tagLabel } from '../checkin/vocabulary';
import { Icon } from '../../components/Icons';
import { nowInstant } from '../../lib/datetime';
import type { HyperfocusProps } from '../../types/props';

export function HyperfocusOverlay({ hyperfocus, setHyperfocus, setDiary, setLogs, todayLog }: HyperfocusProps) {
    const { t } = useTranslation(['common', 'today']);
    const [phase, setPhase] = useState(hyperfocus.status); // setup, running, finished, interrupted
    const [timeLeft, setTimeLeft] = useState(hyperfocus.duration * 60);
    const [task, setTask] = useState(hyperfocus.task);
    const [reflection, setReflection] = useState('');
    const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    useEffect(() => {
        if (phase === 'running') {
            timerRef.current = setInterval(() => {
                setTimeLeft(t => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        setPhase('finished');
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [phase]);

    const startFocus = () => {
        setPhase('running');
        setTimeLeft(hyperfocus.duration * 60);
    };

    const finishCycle = () => {
        // Save it to the journal.
        const entry = t('common:hyperfocus.journalEntry', { minutes: hyperfocus.duration, what: reflection || task });
        setDiary(prev => [{ id: Date.now(), date: nowInstant(), content: entry }, ...prev]);
        
        // A focus bonus on the day's check-in.
        if (todayLog) {
            setLogs(prev => prev.map(l => l.id === todayLog.id ? { ...l, focus: Math.min(10, l.focus + 1) } : l));
        }
        
        setHyperfocus(null);
    };

    const interruptCycle = () => {
        clearInterval(timerRef.current);
        setPhase('interrupted');
    };

    const saveInterruption = (reason: string) => {
        if (todayLog) {
            setLogs(prev => prev.map(l => 
                l.id === todayLog.id ? { ...l, hindered: [...new Set([...(l.hindered || []), reason])] } : l
            ));
        }
        setHyperfocus(null);
    };

    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;

    return (
        <div className="fixed inset-0 z-50 bg-[var(--bg-main)]/95 backdrop-blur-xl flex items-center justify-center p-6">
            {/* SETUP PHASE */}
            {phase === 'setup' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 text-cyan-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="rocket" size={26} />
                    </div>
                    <h2 className="text-3xl font-bold text-cyan-400 mb-2">{t('common:hyperfocus.setupHeading')}</h2>
                    <p className="text-gray-400 mb-6">{t('common:hyperfocus.setupBlurb')}</p>
                    <select value={task} onChange={e => setTask(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg px-4 py-3 mb-6 text-white outline-none focus:border-cyan-400">
                        {hyperfocus.todoTasks?.map((t) => <option key={t.id} value={t.text}>{t.text}</option>)}
                        <option value={t('common:hyperfocus.ownTask')}>{t('common:hyperfocus.ownTask')}</option>
                    </select>
                    <button onClick={startFocus} className="w-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold py-4 rounded-lg text-lg">{t('common:hyperfocus.start', { count: hyperfocus.duration })}</button>
                    <button onClick={() => setHyperfocus(null)} className="mt-4 text-gray-400 hover:text-white">{t('common:hyperfocus.cancel')}</button>
                </div>
            )}

            {/* RUNNING PHASE */}
            {phase === 'running' && (
                <div className="text-center">
                    <p className="text-gray-400 mb-4 uppercase tracking-widest text-sm">{t('common:hyperfocus.label')}</p>
                    <div className="text-9xl font-bold text-white tabular-nums mb-8">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</div>
                    <div className="glass-card p-6 rounded-2xl max-w-md mx-auto mb-8 border border-cyan-400/30">
                        <p className="text-xs text-gray-400 mb-1">{t('common:hyperfocus.currentTask')}</p>
                        <p className="text-xl text-white font-medium">{task}</p>
                    </div>
                    <button onClick={interruptCycle} className="px-8 py-3 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition">{t('common:hyperfocus.interrupt')}</button>
                </div>
            )}

            {/* FINISHED PHASE */}
            {phase === 'finished' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border border-green-400/30">
                    <div className="w-16 h-16 rounded-2xl bg-green-400/10 text-green-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="check" size={30} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('common:hyperfocus.doneHeading')}</h2>
                    <p className="text-gray-400 mb-6">{t('common:hyperfocus.doneBlurb', { count: hyperfocus.duration })}</p>
                    <textarea value={reflection} onChange={e => setReflection(e.target.value)} placeholder={t('common:hyperfocus.reflectionPlaceholder')} className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded-lg p-3 mb-6 text-white outline-none focus:border-cyan-400 min-h-[80px]" />
                    <button onClick={finishCycle} className="w-full bg-green-400 text-black font-bold py-3 rounded-lg mb-2">{t('common:hyperfocus.saveAndExit')}</button>
                </div>
            )}

            {/* INTERRUPTED PHASE */}
            {phase === 'interrupted' && (
                <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border border-red-400/30">
                    <div className="w-14 h-14 rounded-2xl bg-red-400/10 text-red-400 flex items-center justify-center mx-auto mb-4">
                        <Icon name="alertTriangle" size={26} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('common:hyperfocus.brokenHeading')}</h2>
                    <p className="text-gray-400 mb-6">{t('common:hyperfocus.brokenBlurb')}</p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                        {DISTRACTION_IDS.map(id => (
                            <button key={id} onClick={() => saveInterruption(id)} className="px-4 py-2 rounded-lg bg-[var(--bg-input)] border border-[var(--border)] text-gray-300 hover:border-red-400 hover:text-red-400 transition">{tagLabel(id, t)}</button>
                        ))}
                    </div>
                    <button onClick={() => setHyperfocus(null)} className="text-gray-400 hover:text-white">{t('common:hyperfocus.justClose')}</button>
                </div>
            )}
        </div>
    );
}
