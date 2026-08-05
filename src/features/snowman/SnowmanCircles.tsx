import { SPHERES, type DayRecord } from './types';

const MAX_RADIUS = 120;
const MIN_RADIUS = 28;

/** Radius grows linearly from MIN at 0 points to MAX at 10 points. */
function radiusFor(score: number, maxRadius: number) {
    const pct = Math.max(0, Math.min(1, score / 10));
    const minR = (MIN_RADIUS / MAX_RADIUS) * maxRadius;
    return minR + pct * (maxRadius - minR);
}

type Props = {
    scores: DayRecord['scores'];
    totalHarmony: number;
    onSphereClick?: (sphere: (typeof SPHERES)[number]['id']) => void;
    maxRadius?: number;
    compact?: boolean;
};

/** The three stacked circles ("snowman") whose size reflects today's score
 *  in each sphere, plus the harmony bar underneath. Reused full-size on the
 *  Snowman page and shrunk down as a little icon in the history list. */
export function SnowmanCircles({ scores, totalHarmony, onSphereClick, maxRadius = MAX_RADIUS, compact = false }: Props) {
    const height = maxRadius * 2 * SPHERES.length * 0.62;

    return (
        <div className="flex flex-col items-center">
            <div className="relative flex flex-col items-center justify-end" style={{ height, width: maxRadius * 2 + 8 }}>
                {SPHERES.map((s, i) => {
                    const score = scores[s.id];
                    const r = radiusFor(score, maxRadius);
                    const Tag: any = onSphereClick ? 'button' : 'div';
                    return (
                        <Tag key={s.id}
                            onClick={onSphereClick ? () => onSphereClick(s.id) : undefined}
                            className={`rounded-full flex items-center justify-center anim-snow-grow ${onSphereClick ? 'cursor-pointer hover:brightness-110 transition' : ''}`}
                            style={{
                                width: r * 2, height: r * 2,
                                background: `radial-gradient(circle at 35% 30%, ${s.color}cc, ${s.color}55)`,
                                border: `2px solid ${s.color}`,
                                marginTop: i === 0 ? 0 : -r * 0.35,
                                zIndex: SPHERES.length - i,
                            }}
                            title={`${s.label}: ${score}/10`}>
                            {!compact && r > 30 && <span className="text-lg">{s.icon}</span>}
                        </Tag>
                    );
                })}
            </div>

            {!compact && (
                <div className="flex gap-4 mt-3">
                    {SPHERES.map(s => (
                        <div key={s.id} className="text-center">
                            <div className="text-xs" style={{ color: s.color }}>{s.icon} {s.label}</div>
                            <div className="text-sm font-bold text-[var(--text-main)] tabular-nums">{scores[s.id]}/10</div>
                        </div>
                    ))}
                </div>
            )}

            {!compact && (
                <div className="w-full max-w-xs mt-4">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                        <span>Гармония</span><span className="font-bold text-[var(--text-main)]">{totalHarmony}%</span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-black/30 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-400 via-pink-400 to-green-400 transition-all duration-700"
                            style={{ width: `${totalHarmony}%` }} />
                    </div>
                </div>
            )}
        </div>
    );
}
