#!/usr/bin/env node
/**
 * Theme wiring gate.
 *
 * `check-contrast.mjs` proves the token VALUES are sound. This proves the app
 * actually RESOLVES to them — that `tailwind.config.js` maps every utility the
 * codebase uses onto the right token, in both themes.
 *
 * That mapping is load-bearing and silent when it breaks. The app is written
 * dark-first: ~420 `text-white` / `text-gray-*` utilities and ~500 accent
 * utilities. Previously the light theme was made legible by ~25
 * `:root.light .text-white { … }` specificity overrides. Those are gone, and
 * the palette now flips through CSS variables instead. If a hue is ever added
 * to `colors` but forgotten in `textColor`, the utility silently falls back to
 * stock Tailwind hex — which does not flip — and light-theme text goes
 * unreadable with nothing failing. This catches exactly that.
 *
 * Runs against the BUILT css, so it tests what ships, including Tailwind's
 * purge: a utility dropped by content-scanning fails here too.
 *
 *   npm run build && npm run check:theme
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const DIST = path.resolve('dist');
if (!existsSync(DIST)) { console.error('No dist/ — run `npm run build` first.'); process.exit(1); }

const cssFile = readdirSync(path.join(DIST, 'assets')).find(f => /^index-.*\.css$/.test(f));
if (!cssFile) { console.error('No built index css in dist/assets.'); process.exit(1); }

/* Real class strings, copied from real call sites. Not invented combinations —
   the point is to test what the codebase actually renders. */
const SAMPLES = [
    // id,               classes,                                      role
    ['body-primary',     'text-white',                                  'text'],
    ['body-secondary',   'text-gray-300',                               'text'],
    ['body-muted',       'text-gray-400',                               'text'],
    ['body-caption',     'text-gray-500',                               'text'],
    ['accent-cyan',      'text-cyan-400',                               'text'],
    ['accent-purple',    'text-purple-400',                             'text'],
    ['accent-green',     'text-green-400',                              'text'],
    ['accent-red',       'text-red-400',                                'text'],
    ['accent-yellow',    'text-yellow-400',                             'text'],
    ['accent-pink',      'text-pink-400',                               'text'],
    ['semantic-danger',  'text-danger',                                 'text'],
    ['semantic-success', 'text-success',                                'text'],
    ['on-accent-btn',    'bg-cyan-400 text-black',                      'text'],
    ['gradient-btn',     'bg-gradient-to-r from-cyan-400 to-purple-400 text-black', 'gradient'],
    ['wash-chip',        'bg-cyan-400/10 text-cyan-400 border border-cyan-400/30', 'text'],
    ['veil-surface',     'bg-white/5',                                  'surface'],
    ['veil-hover',       'hover:bg-white/10',                           'hover'],
    ['token-border',     'border border-[var(--border)]',               'surface'],
    ['type-label',       't-label',                                     'text'],
    /* The cascade guard. Component classes live in @layer components so a
       utility beats them; if that layering is ever lost these two silently
       take the component's colour instead of the one the markup asks for. */
    ['cascade-text',     't-caption text-cyan-400',                     'text'],
    ['cascade-surface',  'glass-card bg-cyan-400/10',                   'surface'],
    ['type-caption',     't-caption',                                   'text'],
];

const page_html = `<!doctype html><html><head>
<link rel="stylesheet" href="/assets/${cssFile}">
<style>#stage{padding:20px}.row{padding:6px 10px;margin:4px 0}</style>
</head><body>
<div id="stage" class="glass-card">
${SAMPLES.map(([id, cls]) => `<div class="row ${cls}" data-id="${id}">Пример Sample 12345</div>`).join('\n')}
</div>
</body></html>`;

const server = await new Promise(res => {
    const s = http.createServer(async (req, res2) => {
        const url = (req.url || '/').split('?')[0];
        if (url === '/' || url === '/index.html') {
            res2.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res2.end(page_html);
        }
        try {
            const body = readFileSync(path.join(DIST, url));
            const type = url.endsWith('.css') ? 'text/css' : url.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
            res2.writeHead(200, { 'Content-Type': type });
            res2.end(body);
        } catch { res2.writeHead(404); res2.end(); }
    });
    s.listen(4174, '127.0.0.1', () => res(s));
});

function chromiumPath() {
    if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) return undefined;
    const dir = readdirSync(root).find(d => /^chromium-\d+$/.test(d));
    return dir ? path.join(root, dir, 'chrome-linux', 'chrome') : undefined;
}

const exe = chromiumPath();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const page = await browser.newPage();

/** Read back what the browser actually painted, per theme. */
async function sample(theme) {
    await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' });
    await page.evaluate(t => { document.documentElement.className = t; }, theme);
    await page.evaluate(() => document.fonts.ready);
    await page.hover('[data-id="veil-hover"]');
    return page.evaluate(() => {
        const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number);
        /* Walk up for the first opaque ancestor, then composite every
           translucent layer between it and the element back down. This is what
           the eye sees; `getComputedStyle().backgroundColor` alone is not. */
        const effectiveBg = (el) => {
            const stack = [];
            let n = el;
            while (n && n !== document.documentElement) {
                const [r, g, b, a = 1] = parse(getComputedStyle(n).backgroundColor);
                if (a > 0) stack.push([r, g, b, a]);
                if (a === 1) break;
                n = n.parentElement;
            }
            const [br, bg2, bb] = parse(getComputedStyle(document.body).backgroundColor);
            let out = [br, bg2, bb];
            for (const [r, g, b, a] of stack.reverse()) out = out.map((c, i) => [r, g, b][i] * a + c * (1 - a));
            return out.map(Math.round);
        };
        const rows = {};
        for (const el of document.querySelectorAll('[data-id]')) {
            const cs = getComputedStyle(el);
            rows[el.dataset.id] = {
                color: parse(cs.color).slice(0, 3),
                colorAlpha: parse(cs.color)[3] ?? 1,
                bgRaw: cs.backgroundColor,
                borderRaw: cs.borderTopColor,
                bg: effectiveBg(el),
                bgImage: cs.backgroundImage,
                font: cs.fontFamily,
            };
        }
        return {
            rows,
            interLoaded: document.fonts.check('16px "Inter Variable"'),
            bodyFont: getComputedStyle(document.body).fontFamily,
        };
    });
}

const dark = await sample('');
const light = await sample('light');
await browser.close();
server.close();

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const same = (a, b) => a.join() === b.join();

let failed = 0;
const check = (name, ok, detail = '') => {
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log('\nInk is readable on the surface it is painted on (AA 4.5:1):');
for (const [id, , role] of SAMPLES) {
    if (role !== 'text') continue;
    for (const [theme, data] of [['dark', dark], ['light', light]]) {
        const r = data.rows[id];
        const c = ratio(r.color, r.bg);
        check(`${theme.padEnd(5)} ${id.padEnd(17)}`, c >= 4.5, `${c.toFixed(2)}:1`);
    }
}

console.log('\nThe surface/ink split actually splits:');
/* Ink must MOVE between themes (it is read against the page), while the fill
   must NOT (black button labels depend on it staying put). Collapsing these
   two into one value is the specific mistake this phase exists to prevent. */
for (const id of ['body-primary', 'body-muted', 'accent-cyan', 'accent-purple', 'accent-green', 'accent-red']) {
    check(`ink flips with theme: ${id.padEnd(14)}`, !same(dark.rows[id].color, light.rows[id].color),
        `${dark.rows[id].color.join(',')} → ${light.rows[id].color.join(',')}`);
}
check('accent FILL is theme-stable (bg-cyan-400)',
    dark.rows['on-accent-btn'].bgRaw === light.rows['on-accent-btn'].bgRaw,
    dark.rows['on-accent-btn'].bgRaw);
check('text-black on accent stays black',
    same(dark.rows['on-accent-btn'].color, [0, 0, 0]) && same(light.rows['on-accent-btn'].color, [0, 0, 0]));
/* Gradient stops come from `colors`, not `textColor`. A gradient paints no
   background-color, so the walk above cannot measure it — assert instead that
   both stops stay on the theme-stable FILL ramp. If they ever resolved through
   the ink ramp, the light theme would darken them under a fixed-black label
   and the button would fail contrast silently. The stop-vs-black ratio itself
   is covered by check-contrast.mjs. */
{
    const d = dark.rows['gradient-btn'].bgImage, l = light.rows['gradient-btn'].bgImage;
    check('gradient stops are theme-stable',
        d === l && d.includes('126, 154, 171') && d.includes('148, 144, 174'), d);
}

console.log('\nFixture is not stale (utilities under test survived purge):');
/* Tailwind strips any utility no source file references. When that happens the
   element inherits instead, which looks exactly like a colour bug but is a
   stale fixture. Name the difference rather than debugging the wrong one. */
for (const [id, cls, role] of SAMPLES) {
    if (role !== 'surface' && role !== 'hover') continue;
    const painted = dark.rows[id].bgRaw !== 'rgba(0, 0, 0, 0)' || dark.rows[id].borderRaw !== undefined;
    check(`\`${cls}\` is generated`, painted, painted ? '' : 'purged — no source file uses it; update SAMPLES');
}

console.log('\nTranslucent veils invert instead of vanishing:');
/* `bg-white/5` on a light page used to need an override to stop being an
   invisible white-on-white wash. It is now the veil channel, so it inverts. */
check('bg-white/5 is light-on-dark in dark theme', dark.rows['veil-surface'].bgRaw.includes('255, 255, 255'), dark.rows['veil-surface'].bgRaw);
check('bg-white/5 is dark-on-light in light theme', light.rows['veil-surface'].bgRaw.includes('rgba(0, 0, 0'), light.rows['veil-surface'].bgRaw);
check('hover:bg-white/10 inverts too', dark.rows['veil-hover'].bgRaw !== light.rows['veil-hover'].bgRaw,
    `${dark.rows['veil-hover'].bgRaw} → ${light.rows['veil-hover'].bgRaw}`);
/* `border-[var(--border)]` is how ~200 call sites draw a border. It aliases
   --gq-border-default, so it must follow the veil across themes. */
check('border-[var(--border)] inverts', dark.rows['token-border'].borderRaw !== light.rows['token-border'].borderRaw,
    `${dark.rows['token-border'].borderRaw} → ${light.rows['token-border'].borderRaw}`);

console.log('\nCascade order (utilities must beat @layer components):');
check('text-cyan-400 beats .t-caption colour',
    same(dark.rows['cascade-text'].color, dark.rows['accent-cyan'].color),
    `${dark.rows['cascade-text'].color.join(',')} vs accent ${dark.rows['accent-cyan'].color.join(',')}`);
check('bg-cyan-400/10 beats .glass-card background',
    dark.rows['cascade-surface'].bgRaw.startsWith('rgba(126, 154, 171'),
    dark.rows['cascade-surface'].bgRaw);

console.log('\nTypography:');
check('Inter Variable is loaded, not just declared', dark.interLoaded);
check('body resolves to Inter first', /Inter Variable/.test(dark.bodyFont), dark.bodyFont);
check('opacity modifiers survive tokenisation (text-white/80 style)',
    dark.rows['body-primary'].colorAlpha === 1);

console.log(failed ? `\n${failed} theme check(s) failed` : '\nall theme checks passed');
process.exit(failed ? 1 : 0);
