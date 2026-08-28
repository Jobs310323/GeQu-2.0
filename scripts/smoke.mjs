// Boot smoke test: serves a production build and checks in a real browser that
// the app starts, the SPA fallback works for deep links, and nothing throws.
//
// Deliberately limited to what is checkable without signing in — every screen
// is behind auth, and a bypass entry point is not something to keep in the
// repository for a test's convenience. Phase 7 adds the authenticated E2E
// suite; this covers the failure that costs the most to miss, which is a build
// that ships and does not boot.
//
//   npm run build && npm run smoke
//
// Env:
//   SMOKE_BASE            test an already-running server instead of serving dist
//   PLAYWRIGHT_CHROMIUM   path to a chromium binary, when the bundled one is absent

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import { chromium } from 'playwright';

const DIST = path.resolve('dist');
const PORT = 4173;
const TYPES = {
    '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
};

function serve() {
    const server = http.createServer(async (req, res) => {
        const url = decodeURIComponent((req.url || '/').split('?')[0]);
        try {
            const file = path.join(DIST, url);
            const body = await readFile(file);
            res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
            res.end(body);
        } catch {
            // Same fallback the deployment uses (see vercel.json), so a deep
            // link is served the shell rather than a 404.
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(await readFile(path.join(DIST, 'index.html')));
        }
    });
    return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

function chromiumPath() {
    if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
    // Some CI images ship a Chromium build that does not match Playwright's
    // pinned revision; use it rather than downloading a second copy.
    const root = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!root || !existsSync(root)) return undefined;
    const dir = readdirSync(root).find(d => /^chromium-\d+$/.test(d));
    return dir ? path.join(root, dir, 'chrome-linux', 'chrome') : undefined;
}

if (!existsSync(DIST)) {
    console.error('No dist/ — run `npm run build` first.');
    process.exit(1);
}

const base = process.env.SMOKE_BASE ?? `http://127.0.0.1:${PORT}`;
const server = process.env.SMOKE_BASE ? null : await serve();

const executablePath = chromiumPath();
const browser = await chromium.launch(executablePath ? { executablePath } : {});
const page = await browser.newPage();
page.setDefaultTimeout(20_000);

const errors = [];
page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

const checks = [];
const check = (name, ok, detail = '') => {
    checks.push({ name, ok, detail });
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

await page.goto(base, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => document.getElementById('root')?.childElementCount > 0);
check('app boots and renders into #root', true);

const deep = await page.goto(`${base}/finance`, { waitUntil: 'domcontentloaded' });
check('deep link is served the app shell', deep?.status() === 200, `HTTP ${deep?.status()}`);

const unknown = await page.goto(`${base}/no-such-page`, { waitUntil: 'domcontentloaded' });
check('unknown path is served the app shell', unknown?.status() === 200, `HTTP ${unknown?.status()}`);

check('no page errors', errors.length === 0, errors.length ? `\n      ${[...new Set(errors)].join('\n      ')}` : '');

await browser.close();
server?.close();

const failed = checks.filter(c => !c.ok).length;
console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
process.exit(failed ? 1 : 0);
