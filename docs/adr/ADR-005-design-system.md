# ADR-005 — Design system: one token layer

**Status:** Accepted · 2026-08-28

## Context

Two design systems coexist:

- **Production** — `src/index.css`: CSS custom properties (`--bg-main`, `--bg-card`,
  `--accent-cyan`, `--accent-purple`, `--accent-pink`, `--accent-red`, `--text-main`,
  `--text-muted`, `--border`), a `.glass-card` utility, and a block of `:root.light .text-white`
  style overrides that remap ~260 dark-first Tailwind utilities for the light theme.
  `tailwind.config.js` additionally redefines Tailwind's stock hues so ~500 existing call sites
  inherit a desaturated palette without being edited.
- **Preview** — `src/concept-v2/`: a second application at `/concept-v2` with its own `Sidebar`,
  `BentoCard`, `Icons`, `RadialGauge`, `TagPill`, `nav.ts` and `mockData.ts`.

Two sources of truth means every fix is made twice or diverges. Separately, the production layer
has no spacing scale, no radius scale, no shadow scale, no motion scale, no z-index scale, and no
typography hierarchy — those values are chosen ad hoc per component. Semantic colour (success /
warning / error / info) is not distinguished from brand accent, so `text-green-400` means both
"positive result" and "this decorative element is green".

## Decision

**One token layer: `src/styles/tokens.css`.**

Defines colour, semantic colour, surface, text, border, spacing (4 · 8 · 12 · 16 · 20 · 24 · 32 ·
40 · 48 · 64), radius, shadow, typography (Display / H1 / H2 / H3 / Body / Small / Caption /
Metric / Label, each with size, line-height, weight, letter-spacing), motion, z-index and
breakpoints.

Rules:

1. **Semantic colour is separated from brand accent.** `--color-success` is not an alias of the
   green accent; a result being positive and an element being green are different facts.
2. **Legacy tokens stay as aliases.** `--accent-cyan` etc. are redefined *in terms of* the new
   tokens, so no existing call site breaks. They are removed only after the last consumer has
   migrated and been verified — `audit → mapping → migrate → verify → remove`.
3. **`concept-v2` is merged, then deleted.** Its components move into `src/components/` and are
   verified in the real app; only then does `src/concept-v2/` and the `/concept-v2` branch in
   `main.tsx` go.
4. **One typeface: Inter.** Already the body font, and it ships the tabular numerals the metric
   displays depend on. Not a new decision — a decision to stop leaving it implicit.
5. **Glass is a material, not the language.** `.glass-card` remains available as a treatment for
   elevated surfaces. It stops being the default wrapper for every element.
6. **Restraint.** No decorative gradients, no glow, no rainbow dashboards, no animation without a
   functional purpose. Motion respects `prefers-reduced-motion`.

## Consequences

**Positive.** One place to change a value; consistent spacing, radius and type; semantic colour
becomes meaningful and therefore accessible; the light-theme override block in `index.css` can be
retired as consumers migrate; deleting `concept-v2` removes a whole class of divergence.

**Negative.** A long migration across ~500 Tailwind call sites, with real risk of visual drift.
Aliasing keeps it incremental, but the interim state has two vocabularies in the tree at once.

**Neutral.** `tailwind.config.js` keeps its hue redefinitions until the call sites migrate; then
the mapping moves into the token layer.

## Alternatives considered

**Adopt a component library (shadcn/ui, Radix + a theme).** Rejected: would replace the app's
existing visual identity wholesale, which is a rewrite, not a migration. Radix primitives remain
worth considering later for individual accessibility-critical widgets (dialog, menu, tooltip) —
that is a separate, narrower decision.

**Keep both layers and unify later.** Rejected: "later" is what produced the divergence.

**Tailwind v4 CSS-first `@theme`.** Attractive — it is exactly this token model natively — but a
major-version upgrade is a separate change with its own risk. Revisit after the token layer exists,
at which point the upgrade becomes mostly mechanical.
