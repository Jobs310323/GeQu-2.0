import { ProgressBar } from '@gequ/design-system';

/** The three fill modes at a realistic in-progress value. */
export function Fills() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 240 }}>
            <ProgressBar value={68} fill="gradient" />
            <ProgressBar value={45} fill="solid" />
            <ProgressBar value={82} fill="#e0566e" />
        </div>
    );
}

/** Thickness range, from the thin XP bar to a chunkier achievement bar. */
export function Sizes() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: 240 }}>
            <ProgressBar value={30} height={4} />
            <ProgressBar value={60} height={8} />
            <ProgressBar value={90} height={14} />
        </div>
    );
}
