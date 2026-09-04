import { Icon } from '../reexports';

type Tone = 'accent' | 'good' | 'warn' | 'bad' | 'muted';

type Props = {
    icon: string;
    size?: number;
    /** Tint: accent = violet (--gq-grad-a), good/warn/bad = the status tokens, muted = neutral grey. */
    tone?: Tone;
    shape?: 'circle' | 'square';
    /** Box size in px — the icon itself scales to ~55% of it, matching the app's own ratio (e.g. 40px box / ~19px icon in PageHeader). */
    boxSize?: number;
    className?: string;
};

const TONE_VAR: Record<Tone, string> = {
    accent: 'var(--gq-grad-a)',
    good: 'var(--gq-good)',
    warn: 'var(--gq-warn)',
    bad: 'var(--gq-bad)',
    muted: 'var(--gq-text-muted)',
};

/**
 * The "icon in a tinted circle/square" idiom repeated 15+ times across the
 * app (PageHeader's own title icon, Gym/Finance/HyperfocusOverlow empty
 * states and phase headers, Sidebar's level badge) at a dozen different
 * hand-picked size/color combinations — this is that shape as one component.
 * Uses `color-mix` off the token the same way PageHeader does, so it reads
 * correctly in light mode without a second set of colors.
 */
export function IconBadge({ icon, size = 19, tone = 'accent', shape = 'circle', boxSize, className = '' }: Props) {
    const color = TONE_VAR[tone];
    const box = boxSize ?? Math.round(size * 2.1);
    return (
        <div
            className={`flex items-center justify-center shrink-0 ${shape === 'circle' ? 'rounded-full' : 'rounded-xl'} ${className}`}
            style={{
                width: box,
                height: box,
                background: `color-mix(in srgb, ${color} 16%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
                color,
            }}
        >
            <Icon name={icon} size={size} />
        </div>
    );
}
