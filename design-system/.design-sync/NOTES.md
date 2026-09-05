# design-sync notes — @gequ/design-system

Package shape, real build (`vite build` → `dist/index.es.js` + `.d.ts` +
`dist/design-system.css`). 34 components, one group (`general`).

## cssEntry hash note

`cfg.cssEntry` points at `dist/design-system.css` — a stable filename (no
hash), unlike the main app's `vite build` output. No copy step needed here,
unlike the root GeQu-2.0 app.

## Body background — fixed 2026-09-05

`src/styles.css` was missing `body { background: var(--gq-bg-grad); }` (the
app's `index.css` has it, this package's own stylesheet didn't). Several
tokens are tuned against that dark page background — e.g. `TagChips`' pale
`purple-400/10` wash reads as barely-visible on a white canvas. Added the
same rule here so previews (and any design actually built with this
system) render against the right backdrop by default. If a future compiled
component still looks washed out on a light background, check this rule is
still present before assuming the component itself is broken.

## Authored previews

Only 3 components needed manual previews to pass the render-check gate —
their floor-card defaults (empty array / unchecked / 0%) rendered
genuinely blank pixels, not just plain:

- `Checkbox` — both variants (`default`, `circle`), checked + unchecked.
- `ProgressBar` — fill variants + thickness range.
- `TagChips` — populated + empty state.

The other 31 ship as floor cards (fully importable, honest "not yet
authored" placeholder card) — authorable incrementally on any future sync,
nothing blocking.

## Known render warns (non-blocking, triaged)

`Collapsible`, `NavGroup`, `Slider`, `StatTile` render `[RENDER_THIN]` —
their floor-card default props produce a bare component name and nothing
else (no children/value passed). Not authored yet; a future resync should
NOT treat these as new warnings, they're expected until someone authors
previews for them too.

## Re-sync risks

- `Input`'s floor card renders as a large near-black block (no placeholder,
  no value) — technically correct (`--gq-input-bg` is near-black by
  design) but not a flattering default; a low-priority preview-authoring
  candidate.
- The `pkg` field's PKG_DIR resolution relies on `--entry ./dist/index.es.js`
  being passed on every `package-build.mjs`/`resync.mjs` invocation (no
  `node_modules/@gequ/design-system` exists for it to find another way) —
  always include `--entry` explicitly, per the command below.
- 31/34 components have no authored preview — first candidates for future
  incremental authoring: `Modal`, `Toast` (overlay-ish, may need
  `cfg.overrides` for card mode), `Select`, `AlertBanner`.

## Commands

```bash
cd design-system
npm run build
node .ds-sync/resync.mjs --config .design-sync/config.json --node-modules ./node_modules \
  --entry ./dist/index.es.js --out ./ds-bundle --remote .design-sync/.cache/remote-sync.json
```

(First sync — this one — omitted `--remote`; every resync after should fetch
`_ds_sync.json` from the project first and pass it, per the base skill.)
