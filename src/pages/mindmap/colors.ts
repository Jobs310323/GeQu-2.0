import type { TFunction } from 'i18next';
import type { MindColor, Priority } from '../../types/mindmap';

export const MIND_COLORS: MindColor[] = ['cyan', 'purple', 'pink', 'green', 'yellow', 'red'];

const COLOR_KEY: Record<MindColor, string> = {
    cyan: 'plan:mindmap.color.cyan',
    purple: 'plan:mindmap.color.purple',
    pink: 'plan:mindmap.color.pink',
    green: 'plan:mindmap.color.green',
    yellow: 'plan:mindmap.color.yellow',
    red: 'plan:mindmap.color.red',
};

/** Name for a colour swatch. A swatch has no text, so without this its only
 *  label is the colour itself — nothing a screen reader can announce, and
 *  nothing distinguishable to a user who cannot separate these hues. */
export const mindColorLabel = (color: MindColor, t: TFunction): string => t(COLOR_KEY[color]);

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

// Eisenhower quadrant → accent color. Independent from MindColor (the user's
// free node-grouping color) — this one is derived, not chosen.
export const PRIORITY_HEX: Record<Priority, string> = {
    urgent_important: '#B58080',
    not_urgent_important: '#7D9E86',
    urgent_not_important: '#B0A176',
    not_urgent_not_important: '#8B8D93',
};
