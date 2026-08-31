#!/usr/bin/env node
/**
 * Accessibility gate.
 *
 * `npm run lint` (oxlint's jsx-a11y plugin) catches what is visible in the
 * source: a div with a click handler, an input with no label. It cannot see
 * anything that only exists at runtime — where focus goes, whether Escape
 * works, whether the background is really inert, whether a 320px viewport
 * scrolls sideways. That is what this covers.
 *
 * Two targets:
 *
 *   1. `scripts/a11y/fixture.html` — the shared interaction primitives, mounted
 *      directly. Get `Modal` wrong and all eight overlays are wrong, so it is
 *      worth testing once, properly, rather than eight times by hand.
 *   2. The app's unauthenticated shell, swept with axe.
 *
 * The honest limit: nearly every screen sits behind Clerk auth, and shipping an
 * auth bypass so a test can log in is a real security surface. Per-screen axe
 * coverage needs the authenticated E2E harness — Phase 7 — and this gate does
 * not pretend otherwise.
 *
 *   npm run check:a11y
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import { AxeBuilder } from '@axe-core/playwright';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PORT = 5199;

function chromiumPath() {
    if (process.env.PLAYWRIGHT_CHROMIUM) return process.env.PLAYWRIGHT_CHROMIUM;
    const r = process.env.PLAYWRIGHT_BROWSERS_PATH;
    if (!r || !existsSync(r)) return undefined;
    const d = readdirSync(r).find(x => /^chromium-\d+$/.test(x));
    return d ? path.join(r, d, 'chrome-linux', 'chrome') : undefined;
}

const server = await createServer({ root: ROOT, server: { port: PORT, host: '127.0.0.1' }, logLevel: 'error' });
await server.listen();

const exe = chromiumPath();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
// axe-core/playwright requires a page created from an explicit context.
const context = await browser.newContext();
const page = await context.newPage();
page.setDefaultTimeout(20_000);

const errors = [];
page.on('pageerror', e => errors.push(e.message));

let failed = 0;
const check = (name, ok, detail = '') => {
    if (!ok) failed++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const base = `http://127.0.0.1:${PORT}`;
await page.goto(`${base}/scripts/a11y/fixture.html`, { waitUntil: 'networkidle' });

/* ── Dialogs ────────────────────────────────────────────────────────────────
   Every one of these was broken in all eight hand-rolled overlays before the
   migration to native <dialog>. */
console.log('\nDialog behaviour:');

await page.click('#open-modal');
await page.waitForSelector('dialog[open]');

check('opens as a real dialog element', await page.locator('dialog[open]').count() === 1);

const focusedOnOpen = await page.evaluate(() => {
    const d = document.querySelector('dialog');
    return d?.contains(document.activeElement) ?? false;
});
check('focus moves inside on open', focusedOnOpen);

/* The platform makes everything outside the top-layer dialog inert. This is the
   guarantee a hand-rolled `<div class="fixed inset-0">` can never give: there,
   Tab walked straight out of the dialog into the page behind it. */
const inert = await page.evaluate(() => {
    const outside = document.getElementById('outside-button');
    outside?.focus();
    return document.activeElement?.id !== 'outside-button';
});
check('background is inert (outside control cannot take focus)', inert);

const trapped = await page.evaluate(async () => {
    const d = document.querySelector('dialog');
    const before = document.activeElement;
    for (let i = 0; i < 12; i++) {
        // Walking the tab ring should never leave the dialog subtree.
        const el = document.activeElement;
        if (el && !d?.contains(el)) return false;
        el?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    }
    return d?.contains(before) ?? false;
});
check('focus stays within the dialog subtree', trapped);

const named = await page.evaluate(() => {
    const d = document.querySelector('dialog');
    const id = d?.getAttribute('aria-labelledby');
    return Boolean(id && document.getElementById(id)?.textContent?.trim());
});
check('dialog has an accessible name', named);

await page.keyboard.press('Escape');
await page.waitForSelector('dialog[open]', { state: 'detached' }).catch(() => {});
check('Escape closes it', await page.locator('dialog[open]').count() === 0);

const restored = await page.evaluate(() => document.activeElement?.id);
check('focus returns to the control that opened it', restored === 'open-modal', `landed on #${restored || 'body'}`);

/* ── Skip link ─────────────────────────────────────────────────────────── */
console.log('\nSkip link:');
// Reload so the tab ring starts from the top of the document, independent of
// wherever the dialog run above left focus.
await page.goto(`${base}/scripts/a11y/fixture.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.activeElement?.blur?.());
await page.keyboard.press('Tab');
// The link slides in over --gq-duration-fast; measure after it lands.
await page.waitForTimeout(300);
const skip = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || !el.classList.contains('gq-skip-link')) return { first: false };
    const r = el.getBoundingClientRect();
    return { first: true, visible: r.top >= 0 && r.bottom <= window.innerHeight, target: el.getAttribute('href') };
});
check('is the first thing in the tab order', skip.first);
check('becomes visible when focused', skip.visible === true);
check('points at the main landmark', skip.target === '#main');

/* ── Viewports ─────────────────────────────────────────────────────────────
   Horizontal overflow is the failure that makes a phone unusable, and it is
   invisible on a desktop-sized dev window. */
console.log('\nNo horizontal overflow:');
for (const w of [320, 375, 390, 430, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 800 });
    await page.waitForTimeout(60);
    const over = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`${w}px`, over <= 1, over > 1 ? `overflows by ${over}px` : '');
}
await page.setViewportSize({ width: 1280, height: 800 });

/* ── Fixed widths, statically ──────────────────────────────────────────────
   The runtime sweep above can only measure what the fixture renders, and
   almost every screen is behind auth. A width hard-coded wider than the
   narrowest supported viewport overflows deterministically, though — no render
   needed to know it. Scan the source for the ones that cannot fit.

   320px minus the layout's own `p-4` on each side leaves 288px of content. */
console.log('\nNo width hard-coded wider than a 320px viewport:');
{
    const NARROWEST = 288;
    const files = [];
    const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) walk(full);
            else if (e.name.endsWith('.tsx')) files.push(full);
        }
    };
    walk(path.join(ROOT, 'src'));

    // Tailwind's `w-N` spacing scale is N * 0.25rem = N * 4px.
    const offenders = [];
    for (const f of files) {
        const src = readFileSync(f, 'utf8');
        src.split('\n').forEach((line, i) => {
            for (const m of line.matchAll(/(?<!max-)(?<![\w:-])w-\[(\d+)px\]/g)) {
                if (Number(m[1]) > NARROWEST) offenders.push(`${path.relative(ROOT, f)}:${i + 1} ${m[0]}`);
            }
            for (const m of line.matchAll(/(?<!max-)(?<![\w:-])w-(\d{2,3})(?![\w./-])/g)) {
                if (Number(m[1]) * 4 > NARROWEST) offenders.push(`${path.relative(ROOT, f)}:${i + 1} ${m[0]}`);
            }
        });
    }
    check(`${files.length} components scanned`, offenders.length === 0,
        offenders.length ? `\n      ${offenders.join('\n      ')}` : '');
}

/* ── axe, both themes ──────────────────────────────────────────────────── */
console.log('\naxe (WCAG 2.2 A/AA) on the fixture:');
for (const theme of ['dark', 'light']) {
    await page.evaluate(t => { document.documentElement.className = t === 'light' ? 'light' : 'dark'; }, theme);
    const res = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
    const v = res.violations;
    check(`${theme}: ${res.passes.length} passes`, v.length === 0,
        v.length ? v.map(x => `${x.id} (${x.nodes.length})`).join(', ') : '');
}

/* ── The app shell, as far as it can be reached ────────────────────────── */
console.log('\naxe on the unauthenticated app shell:');
await page.goto(base, { waitUntil: 'networkidle' });
const shell = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
check(`shell: ${shell.passes.length} passes`, shell.violations.length === 0,
    shell.violations.length ? shell.violations.map(x => `${x.id} (${x.nodes.length})`).join(', ') : '');

check('no page errors', errors.length === 0, [...new Set(errors)].join('; '));

await browser.close();
await server.close();

console.log(failed ? `\n${failed} a11y check(s) failed` : '\nall a11y checks passed');
process.exit(failed ? 1 : 0);
