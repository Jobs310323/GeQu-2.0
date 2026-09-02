import type { Category } from './types';

export const categories: Category[] = [
    { id: 'basics', title: 'How it works', icon: '🔬', blurb: "What's going on in your head, and why \"just get it together\" doesn't work" },
    { id: 'focus', title: 'Focus and starting', icon: '🎯', blurb: 'How to start, and not lose the thread' },
    { id: 'time', title: 'Time and plans', icon: '⏳', blurb: 'Planning that survives contact with reality' },
    { id: 'emotions', title: 'Emotions', icon: '🌊', blurb: 'Impulsivity, sensitivity to criticism, burnout' },
    { id: 'body', title: 'Body and sleep', icon: '🌙', blurb: 'Sleep, movement, food — the strongest levers' },
    { id: 'life', title: 'Home and people', icon: '🏠', blurb: 'Home, money, relationships' },
];
