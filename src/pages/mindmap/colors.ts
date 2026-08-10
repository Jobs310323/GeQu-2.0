import type { MindColor } from '../../types/mindmap';

export const MIND_COLORS: MindColor[] = ['cyan', 'purple', 'pink', 'green', 'yellow', 'red'];

// Matches the desaturated accent palette in tailwind.config.js.
export const COLOR_HEX: Record<MindColor, string> = {
    cyan: '#7E9AAB',
    purple: '#9490AE',
    pink: '#AE8E9B',
    green: '#7D9E86',
    yellow: '#B0A176',
    red: '#B58080',
};

export const COLOR_DOT_CLASS: Record<MindColor, string> = {
    cyan: 'bg-cyan-400',
    purple: 'bg-purple-400',
    pink: 'bg-pink-400',
    green: 'bg-green-400',
    yellow: 'bg-yellow-400',
    red: 'bg-red-400',
};

export const COLOR_OUTLINE_CLASS: Record<MindColor, string> = {
    cyan: 'outline-cyan-400',
    purple: 'outline-purple-400',
    pink: 'outline-pink-400',
    green: 'outline-green-400',
    yellow: 'outline-yellow-400',
    red: 'outline-red-400',
};
