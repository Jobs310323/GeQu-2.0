// Translation gate.
//
// Phase 11 migrates ~2300 lines of Russian literals across 136 files, which is
// several sittings of work. The thing that makes that safe to do incrementally
// is not diligence, it is this script: it fails the build when a finished
// screen regresses, when a key exists in one language and not the other, or
// when a translator drops a placeholder.
//
// Four checks, each of which has been canary-tested by being deliberately
// broken. A gate that has never failed on purpose is not known to work — Phase
// 6 learned that when `.oxlintrc.json` silently failed to parse and reported
// zero findings for several minutes.

import fs from 'node:fs';
import path from 'node:path';

const LOCALES_DIR = 'src/i18n/locales';
const MANIFEST = 'src/i18n/migrated.json';

let failures = 0;
let checks = 0;

const fail = (msg) => { failures++; console.error(`  ✗ ${msg}`); };
const check = () => { checks++; };

// ── Load ────────────────────────────────────────────────────────────────────

const locales = fs.readdirSync(LOCALES_DIR).filter(d =>
    fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());

/** `{ locale: { namespace: { 'a.b.c': 'text' } } }` — nested JSON flattened. */
const bundles = {};
for (const locale of locales) {
    bundles[locale] = {};
    for (const file of fs.readdirSync(path.join(LOCALES_DIR, locale))) {
        if (!file.endsWith('.json')) continue;
        const ns = file.replace(/\.json$/, '');
        const raw = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, locale, file), 'utf8'));
        bundles[locale][ns] = flatten(raw);
    }
}

function flatten(obj, prefix = '', out = {}) {
    for (const [k, v] of Object.entries(obj)) {
        const key = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
        else out[key] = v;
    }
    return out;
}

const sources = [];
(function walk(dir) {
    for (const entry of fs.readdirSync(dir)) {
        const p = path.join(dir, entry);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.(tsx?|mjs)$/.test(entry)) sources.push(p);
    }
})('src');

const sourceText = sources
    .filter(p => !p.endsWith('.test.ts') && !p.endsWith('.test.tsx'))
    .map(p => fs.readFileSync(p, 'utf8'))
    .join('\n');

// i18next appends a plural category to the base key. Which categories a
// language needs is `Intl.PluralRules`' business, not ours — Russian takes
// one/few/many/other, English one/other — so parity is compared on base keys
// and the categories are checked per locale against the platform.
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;
const baseKey = (k) => k.replace(PLURAL_SUFFIX, '');
const pluralOf = (k) => k.match(PLURAL_SUFFIX)?.[1];

// ── 1. Key parity ───────────────────────────────────────────────────────────

console.log('\nKey parity');
const allNamespaces = [...new Set(locales.flatMap(l => Object.keys(bundles[l])))];

for (const ns of allNamespaces) {
    for (const locale of locales) {
        if (!bundles[locale][ns]) { fail(`${locale} is missing the whole "${ns}" namespace`); continue; }
    }
    const bases = {};
    for (const locale of locales) {
        bases[locale] = new Set(Object.keys(bundles[locale][ns] ?? {}).map(baseKey));
    }
    for (const locale of locales) {
        for (const other of locales) {
            if (locale === other) continue;
            for (const key of bases[locale]) {
                check();
                if (!bases[other].has(key)) fail(`${ns}:${key} exists in ${locale} but not in ${other}`);
            }
        }
    }
}

// ── 2. Plural completeness ──────────────────────────────────────────────────

console.log('Plural forms');
for (const locale of locales) {
    const required = new Set(new Intl.PluralRules(locale).resolvedOptions().pluralCategories);
    for (const [ns, table] of Object.entries(bundles[locale])) {
        const plurals = new Map();
        for (const key of Object.keys(table)) {
            const form = pluralOf(key);
            if (!form) continue;
            const base = baseKey(key);
            if (!plurals.has(base)) plurals.set(base, new Set());
            plurals.get(base).add(form);
        }
        for (const [base, forms] of plurals) {
            check();
            const missing = [...required].filter(f => !forms.has(f));
            if (missing.length) fail(`${locale}/${ns}: ${base} is missing plural form(s) ${missing.join(', ')}`);
            const extra = [...forms].filter(f => !required.has(f));
            if (extra.length) fail(`${locale}/${ns}: ${base} has plural form(s) ${extra.join(', ')} that ${locale} does not use`);
        }
    }
}

// ── 3. Interpolation parity ─────────────────────────────────────────────────
//
// A translator who drops `{{count}}` produces a sentence that reads fine and is
// missing the number it was written to carry. The format specifier after a
// comma (`{{typical, number}}`) is presentation and may legitimately differ, so
// only the variable name is compared.

console.log('Interpolation parity');
const placeholders = (value) =>
    new Set([...String(value).matchAll(/\{\{\s*([\w.]+)/g)].map(m => m[1]));

for (const ns of allNamespaces) {
    const reference = locales[0];
    for (const [key, value] of Object.entries(bundles[reference][ns] ?? {})) {
        const want = placeholders(value);
        for (const locale of locales.slice(1)) {
            // Compare like with like: a plural key may only exist in one locale
            // (`_few` is Russian-only), so fall back to the base key's other forms.
            const table = bundles[locale][ns] ?? {};
            const candidate = table[key] ?? table[`${baseKey(key)}_other`] ?? table[baseKey(key)];
            if (candidate === undefined) continue; // already reported by check 1
            check();
            const got = placeholders(candidate);
            const missing = [...want].filter(p => !got.has(p));
            const added = [...got].filter(p => !want.has(p));
            if (missing.length) fail(`${ns}:${key} — ${locale} is missing {{${missing.join('}}, {{')}}}`);
            if (added.length) fail(`${ns}:${key} — ${locale} has {{${added.join('}}, {{')}}} that ${reference} does not`);
        }
    }
}

// ── 4. Unused keys ──────────────────────────────────────────────────────────
//
// Deliberately approximate, in the forgiving direction: a key counts as used if
// its dotted path appears anywhere in the source, with or without a namespace
// prefix, or if a template literal's static prefix covers it. Resolving which
// namespace a bare `t('state.heading')` belongs to would mean tracking each
// component's `useTranslation(...)`, which is more machinery than the finding
// is worth. What this reliably catches is a key nothing references at all.

console.log('Unused keys');
const dynamicPrefixes = [...sourceText.matchAll(/`([\w:.]*?)\$\{/g)].map(m => m[1]).filter(Boolean);

const escapeRe = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `a.b.c` -> `['a.b', 'a']`. */
function ancestorsOf(key) {
    const out = [];
    for (let cut = key.lastIndexOf('.'); cut > 0; cut = key.lastIndexOf('.', cut - 1)) {
        out.push(key.slice(0, cut));
    }
    return out;
}

for (const ns of allNamespaces) {
    for (const key of new Set(Object.keys(bundles[locales[0]][ns] ?? {}).map(baseKey))) {
        if (key.startsWith('_')) continue; // `_comment` and friends
        check();
        const used =
            sourceText.includes(`${ns}:${key}`)
            || sourceText.includes(`'${key}'`)
            || sourceText.includes(`"${key}"`)
            || sourceText.includes(`\`${key}\``)
            || dynamicPrefixes.some(p => `${ns}:${key}`.startsWith(p) || key.startsWith(p))
            // A whole sub-object read counts too: the palette reads
            // `resources[locale].capture.aliases` rather than each alias key.
            // Namespace-qualified deliberately — matching a bare parent segment
            // like `action` would be satisfied by any `action.foo` anywhere in
            // the app, which is how the first version of this check let a dead
            // key through its own canary.
            // The parent must be referenced as a COMPLETE path, not as the
            // prefix of a longer one: `common:action` appears in every
            // `t('common:action.close')`, so a substring test here would let
            // any dead key under `action` pass — which is exactly what the
            // canary for this check caught.
            || ancestorsOf(key).some(parent =>
                new RegExp(`${escapeRe(ns)}[.:]${escapeRe(parent)}(?![\\w.])`).test(sourceText));
        if (!used) fail(`${ns}:${key} is not referenced by any source file`);
    }
}

// ── 5. Cyrillic escape in migrated files ────────────────────────────────────
//
// The check that makes the migration incremental. A file listed in
// `migrated.json` has had all of its user-facing text moved to keys, so any
// Cyrillic left in it outside a comment is a string that slipped back in.

console.log('Migrated files');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

/** Removes `//` and block comments without being fooled by `//` inside a string. */
function stripComments(src) {
    let out = '';
    let i = 0;
    let quote = null;
    while (i < src.length) {
        const c = src[i];
        const next = src[i + 1];
        if (quote) {
            if (c === '\\') { out += '  '; i += 2; continue; }
            if (c === quote) quote = null;
            out += c; i++; continue;
        }
        if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i++; continue; }
        if (c === '/' && next === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
        if (c === '/' && next === '*') {
            i += 2;
            while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i++;
            i += 2;
            continue;
        }
        out += c; i++;
    }
    return out;
}

const CYRILLIC = /[Ѐ-ӿ]/;
for (const file of manifest.files) {
    check();
    if (!fs.existsSync(file)) { fail(`${file} is listed in ${MANIFEST} but does not exist`); continue; }
    const source = fs.readFileSync(file, 'utf8');
    const original = source.split('\n');
    const stripped = stripComments(source).split('\n');
    stripped.forEach((line, n) => {
        if (!CYRILLIC.test(line)) return;
        // An `i18n-allow` comment on the same line marks text that is correct
        // in Cyrillic whatever the interface language is — a language's own
        // name in its own script, most obviously. It has to be justified in
        // the comment, and it is line-scoped so it cannot quietly cover a file.
        if (/i18n-allow/.test(original[n] ?? '')) return;
        fail(`${file}:${n + 1} — Cyrillic outside a comment in a migrated file: ${line.trim().slice(0, 70)}`);
    });
}

// ── Result ──────────────────────────────────────────────────────────────────

console.log(`\n${checks} checks across ${locales.length} locales and ${allNamespaces.length} namespaces`);
if (failures) {
    console.error(`\n${failures} i18n problem(s).\n`);
    process.exit(1);
}
console.log('i18n OK\n');
