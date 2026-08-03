import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';

export function CirclesOfInfluence({ circles, setCircles }: any) {
    const [text, setText] = useState('');
    const [activeCircle, setActiveCircle] = useState<'inner' | 'middle' | 'outer'>('inner');

    const addItem = () => {
        if (!text.trim()) return;
        setCircles([...circles, { id: Date.now(), text, circle: activeCircle }]);
        setText('');
    };

    const removeItem = (id: number) => {
        setCircles(circles.filter((c: any) => c.id !== id));
    };

    const config = {
        inner: { label: 'Мой контроль', text: 'text-red-400', border: 'border-red-400/30', bg: 'bg-red-400/10' },
        middle: { label: 'Мое влияние', text: 'text-yellow-400', border: 'border-yellow-400/30', bg: 'bg-yellow-400/10' },
        outer: { label: 'Вне контроля', text: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/5' }
    };

    const circleOrder = ['inner', 'middle', 'outer'] as const;
    const dotClass = {
        inner: 'bg-red-400', middle: 'bg-yellow-400', outer: 'bg-blue-400',
    } as const;

    return (
        <div className="max-w-5xl mx-auto">
            <PageHeader page="circles" title="Круги влияния" subtitle="Фокусируйся на красном, отпускай синее. Снижай тревожность." />

            {/* Визуализация легенды */}
            <div className="glass-card p-8 rounded-2xl mb-6 flex flex-col md:flex-row items-center gap-8">
                <div className="relative w-48 h-48 flex items-center justify-center flex-shrink-0">
                    <div className="absolute w-48 h-48 rounded-full border-4 border-blue-400/30 bg-blue-400/5"></div>
                    <div className="absolute w-32 h-32 rounded-full border-4 border-yellow-400/30 bg-yellow-400/5"></div>
                    <div className="absolute w-16 h-16 rounded-full border-4 border-red-400/40 bg-red-400/10 flex items-center justify-center text-[10px] text-center text-red-400 font-bold p-1">Мой контроль</div>
                </div>
                <div className="flex-1 w-full">
                    <div className="flex gap-2 mb-3">
                        {circleOrder.map(key => (
                            <button key={key} onClick={() => setActiveCircle(key)}
                                className={`flex-1 px-3 py-2 rounded-xl text-sm border transition ${activeCircle === key ? `${config[key].bg} ${config[key].border} ${config[key].text}` : 'border-[var(--border)] text-gray-400 hover:bg-white/5'}`}>
                                {config[key].label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={text} 
                            onChange={e => setText(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addItem()}
                            placeholder="Например: Погода, Мой сон, Реакция коллеги..."
                            className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded-xl p-3 outline-none focus:border-cyan-400 text-white"
                        />
                        <button onClick={addItem} className="bg-gradient-to-r from-cyan-400 to-purple-400 text-black font-bold px-6 rounded-xl">Добавить</button>
                    </div>
                </div>
            </div>

            {/* Списки по кругам */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {circleOrder.map(key => (
                    <div key={key} className={`glass-card p-6 rounded-2xl border ${config[key].border}`}>
                        <h2 className={`flex items-center gap-2 text-lg font-bold mb-4 ${config[key].text}`}>
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass[key]}`} />
                            {config[key].label}
                        </h2>
                        <div className="space-y-2">
                            {circles.filter((c: any) => c.circle === key).length === 0 && (
                                <p className="text-[var(--text-muted)] text-sm italic">Пусто...</p>
                            )}
                            {circles.filter((c: any) => c.circle === key).map((item: any) => (
                                <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl ${config[key].bg} ${key === 'outer' ? 'opacity-60' : ''}`}>
                                    <span className="text-[var(--text-main)] text-sm">{item.text}</span>
                                    <button onClick={() => removeItem(item.id)} className="text-[var(--text-muted)] hover:text-red-400 text-sm ml-2">✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
