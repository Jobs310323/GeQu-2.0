export interface RavltSession {
    phase: 'intro' | 'trial' | 'interval' | 'delayed' | 'done';
    trial: number; // 1-5, current learning trial while phase === 'trial'
    trialCounts: number[]; // words correctly recalled per completed trial, in order
    waitUntil: number | null; // epoch ms the 20-minute interval ends
    delayedCount: number | null;
    ageBracket: number;
}

export const RAVLT_INTERVAL_MS = 20 * 60 * 1000;
