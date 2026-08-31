#!/usr/bin/env node
/**
 * Contrast gate for the design tokens.
 *
 * Parses `src/styles/tokens.css` — it does not carry its own copy of the
 * palette, because a checker with duplicated values stops being a check the
 * first time someone edits only one of the two.
 *
 * Every ink token is measured against BOTH surfaces of BOTH themes. Checking
 * only the canvas is the usual mistake: cards sit above it at a different
 * lightness, and on the dark theme a card is *lighter* than the page, so the
 * card is the harder case for light-on-dark text, not the easier one.
 *
 * Floors are WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and for the
 * `subtle` step (decoration and disabled affordances, never body copy).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const css = readFileSync(resolve(root, 'src/styles/tokens.css'), 'utf8');

/** Split the file into the `:root` block and the `:root.light` block. */
function blockFor(selector) {
    const i = css.indexOf(selector + ' {');
    if (i === -1) throw new Error(`no ${selector} block in tokens.css`);
    const start = css.indexOf('{', i) + 1;
    let depth = 1, j = start;
    while (depth > 0 && j < css.length) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
    }
    return css.slice(start, j - 1);
}

function channelsIn(block) {
    const out = {};
    for (const m of block.matchAll(/(--gq-[\w-]+-rgb)\s*:\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
        out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
    }
    return out;
}

const dark = channelsIn(blockFor(':root'));
const light = { ...dark, ...channelsIn(blockFor(':root.light')) };

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

/** Card is translucent over the canvas — measure what is actually painted. */
const over = (fg, bg, a) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

const INK = [
    '--gq-text-primary-rgb', '--gq-text-secondary-rgb', '--gq-text-tertiary-rgb',
    '--gq-text-quaternary-rgb', '--gq-text-subtle-rgb',
    '--gq-cyan-ink-rgb', '--gq-purple-ink-rgb', '--gq-pink-ink-rgb',
    '--gq-green-ink-rgb', '--gq-yellow-ink-rgb', '--gq-red-ink-rgb', '--gq-blue-ink-rgb',
];
/** Filled accent surfaces carry `--gq-text-on-accent` (black) as their label. */
const FILLS = [
    '--gq-cyan-400-rgb', '--gq-purple-400-rgb', '--gq-pink-400-rgb', '--gq-green-400-rgb',
    '--gq-yellow-400-rgb', '--gq-red-400-rgb', '--gq-blue-400-rgb', '--gq-orange-400-rgb',
];

/** Decoration and disabled states only — never body copy. */
const LARGE_TEXT_ONLY = new Set(['--gq-text-subtle-rgb']);

let failures = 0;
const rows = [];

for (const [theme, vars, alpha] of [['dark', dark, 0.72], ['light', light, 0.85]]) {
    const canvas = vars['--gq-surface-canvas-rgb'];
    const card = over(vars['--gq-surface-raised-rgb'], canvas, alpha);

    for (const token of INK) {
        const fg = vars[token];
        if (!fg) { console.error(`missing token ${token} in ${theme}`); failures++; continue; }
        const floor = LARGE_TEXT_ONLY.has(token) ? 3 : 4.5;
        for (const [name, bg] of [['canvas', canvas], ['card', card]]) {
            const r = ratio(fg, bg);
            const ok = r >= floor;
            if (!ok) failures++;
            rows.push([theme, token.replace(/^--gq-|-rgb$/g, ''), name, r, floor, ok]);
        }
    }

    const onAccent = [0, 0, 0]; // --gq-text-on-accent
    for (const token of FILLS) {
        const bg = vars[token];
        if (!bg) { console.error(`missing token ${token} in ${theme}`); failures++; continue; }
        const r = ratio(onAccent, bg);
        const ok = r >= 4.5;
        if (!ok) failures++;
        rows.push([theme, token.replace(/^--gq-|-rgb$/g, ''), 'on-accent', r, 4.5, ok]);
    }
}

const w = Math.max(...rows.map(r => r[1].length));
for (const [theme, token, bg, r, floor, ok] of rows) {
    const line = `${ok ? 'PASS' : 'FAIL'}  ${theme.padEnd(5)} ${token.padEnd(w)}  on ${bg.padEnd(9)} ${r.toFixed(2).padStart(6)}:1  (needs ${floor})`;
    if (!ok) console.error(line); else if (process.env.VERBOSE) console.log(line);
}

console.log(`\ncontrast: ${rows.length - failures}/${rows.length} checks passed`);
if (failures) {
    console.error(`\n${failures} token(s) below WCAG AA. Fix the value in src/styles/tokens.css.`);
    process.exit(1);
}
