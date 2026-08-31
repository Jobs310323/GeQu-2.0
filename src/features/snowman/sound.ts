// Tiny confirmation blip via Web Audio — no audio file/asset needed.
let ctx: AudioContext | null = null;

export function playAddSound() {
    try {
        // Safari exposed AudioContext under a prefix for years and lib.dom does
        // not describe it. Narrow to the one constructor we need rather than
        // casting the whole window.
        const Ctor = window.AudioContext
            ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        ctx ??= new Ctor();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(990, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch {
        // Web Audio unavailable (older Safari, restricted context) — skip silently.
    }
}
