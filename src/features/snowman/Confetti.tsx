import { useEffect, useState } from 'react';

const COLORS = ['#6366f1', '#ec4899', '#22c55e', '#facc15', '#38bdf8'];

/** One-shot confetti burst. Mount it (e.g. keyed by a counter) to fire; it
 *  removes its own particles after the animation finishes. No canvas/library
 *  needed — just a handful of absolutely-positioned divs with a CSS fall. */
export function Confetti() {
    const [particles] = useState(() =>
        Array.from({ length: 24 }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 0.15,
            duration: 0.9 + Math.random() * 0.6,
            color: COLORS[i % COLORS.length],
            rotate: Math.random() * 360,
        })));

    return (
        <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
            {particles.map(p => (
                <span key={p.id}
                    className="absolute top-0 w-2 h-2 rounded-sm anim-confetti-fall"
                    style={{
                        left: `${p.left}%`,
                        backgroundColor: p.color,
                        animationDelay: `${p.delay}s`,
                        animationDuration: `${p.duration}s`,
                        transform: `rotate(${p.rotate}deg)`,
                    }} />
            ))}
        </div>
    );
}

/** Mount-and-forget wrapper: renders Confetti for `ms`, then unmounts itself. */
export function ConfettiBurst({ trigger, ms = 1300 }: { trigger: number; ms?: number }) {
    const [show, setShow] = useState(false);
    useEffect(() => {
        if (trigger === 0) return;
        setShow(true);
        const t = setTimeout(() => setShow(false), ms);
        return () => clearTimeout(t);
    }, [trigger, ms]);
    return show ? <Confetti /> : null;
}
