# ADR-005 — Design system: one token layer

**Status:** Accepted · 2026-08-28 · **Implemented** 2026-08-31 (Phase 5)

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

---

## Implementation note (2026-08-31)

Implemented as decided, with one addition the decision did not anticipate.

**Surface/ink split.** Point 2 said legacy tokens become aliases so no call site breaks. That was
necessary but not sufficient: a *single* value per hue cannot serve both `bg-cyan-400` and
`text-cyan-400` across two themes. Tailwind's `colors` and `textColor` are therefore given
different token sets for the same scale name — fill tones stay stable across themes, ink tones
flip. This is what allowed the `:root.light .text-*` override block to be deleted outright rather
than "retired as consumers migrate"; it is gone now, and no call site changed.

**Point 3 (`concept-v2`) closed cheaply.** Its five components had already been ported into
`src/components/` and re-themed onto CSS variables in an earlier pass, so nothing needed migrating.
`src/concept-v2/` (347 lines) and the `/concept-v2` branch in `main.tsx` were deleted after
confirming zero live references.

**Point 4 (Inter) was not the no-op it looked like.** The font was declared but never loaded — no
`<link>`, no package. It is now self-hosted (`@fontsource-variable/inter`), latin + cyrillic only.

**Two gates were added**, because a token layer with no enforcement drifts back within a quarter:
`check:contrast` parses `tokens.css` and measures every ink token against both surfaces of both
themes; `check:theme` drives a real browser against the built CSS and asserts the app resolves to
those tokens, that ink flips while fill does not, and that the `@layer components` cascade order
holds.

**Deferred.** Tailwind v4's `@theme` remains the better long-term home for this and remains a
separate decision. The `--accent-*` and `--text-*` aliases are still in place; they are removed per
call site, not in a sweep.
