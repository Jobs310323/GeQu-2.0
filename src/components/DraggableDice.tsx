import { useRef, useState, useEffect } from 'react';

const POS_KEY = 'gequ_dice_pos';
const SIZE = 64;
const DRAG_THRESHOLD = 4; // px of movement before a press counts as a drag

function clampToViewport(x: number, y: number) {
    const maxX = Math.max(0, window.innerWidth - SIZE - 8);
    const maxY = Math.max(0, window.innerHeight - SIZE - 8);
    return { x: Math.min(Math.max(x, 8), maxX), y: Math.min(Math.max(y, 8), maxY) };
}

/**
 * Floating dopamine-roulette button the user can drag anywhere on screen.
 * Position persists; a press that barely moves still counts as a click.
 */
export function DraggableDice({ onClick }: { onClick: () => void }) {
    const [pos, setPos] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
            if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') return saved;
        } catch { /* fall through */ }
        return { x: 32, y: Math.max(8, window.innerHeight - SIZE - 32) };
    });
    const [dragging, setDragging] = useState(false);
    const origin = useRef({ px: 0, py: 0, x: 0, y: 0, moved: false });

    // Keep the button on screen if the window is resized.
    useEffect(() => {
        const onResize = () => setPos((p: any) => clampToViewport(p.x, p.y));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, moved: false };
        setDragging(true);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!dragging) return;
        const dx = e.clientX - origin.current.px;
        const dy = e.clientY - origin.current.py;
        if (!origin.current.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD) origin.current.moved = true;
        if (origin.current.moved) {
            setPos(clampToViewport(origin.current.x + dx, origin.current.y + dy));
        }
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.releasePointerCapture(e.pointerId);
        setDragging(false);
        if (origin.current.moved) {
            try { localStorage.setItem(POS_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
        } else {
            onClick(); // treat as a plain click
        }
    };

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title="Дофаминовая рулетка — можно перетащить"
            style={{ left: pos.x, top: pos.y, touchAction: 'none' }}
            className={`fixed w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 text-black text-3xl font-bold shadow-lg shadow-cyan-400/30 z-40 flex items-center justify-center select-none ${
                dragging ? 'cursor-grabbing scale-105' : 'cursor-grab hover:scale-110 transition-transform'
            }`}
        >
            🎲
        </button>
    );
}
