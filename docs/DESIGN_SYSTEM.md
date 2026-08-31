# GeQu design system

One token layer, consumed two ways: directly as CSS custom properties, and through Tailwind
utilities that are themselves wired to the same tokens. There is no third source of truth.

- `src/styles/tokens.css` — every colour, space, radius, shadow, type, motion and z value
- `src/styles/fonts.css` — the one typeface, self-hosted
- `tailwind.config.js` — maps Tailwind's utility names onto the tokens
- `src/index.css` — base resets and named component classes, all built from tokens

Two gates keep it honest, and both run in CI:

```
npm run check:contrast   # token values meet WCAG AA in both themes
npm run check:theme      # the app resolves to those tokens, in a real browser
```

---

## The one idea worth understanding: surface vs ink

A hue needs **two** values, not one, because the same `cyan-400` is asked to do two different
jobs:

| Job | Token | Behaviour across themes |
|---|---|---|
| Fill — buttons, borders, gradients, washes | `--gq-cyan-400-rgb` | **stable** |
| Ink — text on the page background | `--gq-cyan-ink-rgb` | **flips** |

They cannot be the same value. A tone light enough to carry black button text at 40px is far too
faint as 13px body text on a white page. Collapsing them is the mistake that produced the old
`:root.light .text-cyan-400 { … }` override block.

Tailwind is configured to route them separately:

```js
colors:    { cyan: surfaceScale('cyan') }   // bg-, border-, from-, to-, ring-
textColor: { cyan: inkScale('cyan')     }   // text- only
```

So `bg-cyan-400` and `text-cyan-400` legitimately resolve to different colours, and both are
correct. `check:theme` asserts exactly this: ink must move between themes, fill must not.

### Why this let ~25 CSS overrides be deleted

The app was written dark-first — 124 `text-white`, 297 `text-gray-*`, ~500 accent utilities. The
light theme used to be made legible by out-ranking each utility with a more specific selector:

```css
:root.light .text-white   { color: var(--text-main); }   /* (0,2,0) beats (0,1,0) */
:root.light .text-gray-400 { color: #4A4A55; }
```

Now the utility's own value is a variable that flips with the theme, so there is nothing to
out-rank. The overrides are gone, and a new hue is correct in both themes the moment it is added
to both scales — rather than correct in dark and invisible in light until someone notices.

---

## Colour

### Structure

```
PRIMITIVES   --gq-cyan-400-rgb        raw ramps. Never used by a component.
SEMANTIC     --gq-text-secondary      role names. This is what you use.
             --gq-danger-ink
ALIASES      --text-main, --accent-cyan   pre-token names, kept working.
```

Stored as space-separated RGB channels (`126 154 171`), not hex, so Tailwind can write
`rgb(var(--gq-cyan-400-rgb) / <alpha-value>)` and every opacity modifier in the codebase keeps
working — `bg-cyan-400/10` and `border-cyan-400/30` appear ~500 times.

### The neutral ink ramp

Five steps. Anything below `subtle` is not text.

| Token | Tailwind bridge | Use |
|---|---|---|
| `--gq-text-primary` | `text-white`, `text-gray-200` | body copy, headings |
| `--gq-text-secondary` | `text-gray-300` | supporting copy |
| `--gq-text-tertiary` | `text-gray-400` | muted copy, captions |
| `--gq-text-quaternary` | `text-gray-500` | labels, metadata |
| `--gq-text-subtle` | `text-gray-600` | **decoration and disabled only** — 3:1, not 4.5:1 |

These are not Tailwind's stock greys. Stock `gray-500` on the dark canvas measures **4.0:1**,
below AA, and it was used 87 times for real text.

### Status colour is not brand colour

`--gq-success-*`, `--gq-warning-*`, `--gq-danger-*`, `--gq-info-*` are addressed separately from
`--gq-accent-*`, even where they currently share a primitive. A result being positive and an
element being green are different facts; retheming the brand must not restyle every error state.

Available as `text-success`, `bg-danger`, `border-warning`, `text-info`. Prefer these over hue
names whenever the colour carries meaning.

### Veils: `white` and `black`

`white` is the **translucent veil channel** — `255 255 255` dark, `0 0 0` light. So `bg-white/5`
(68 uses) and `hover:bg-white/10` invert on the light theme instead of vanishing into it.

`black` is deliberately left as real black. Its uses split into modal scrims (`bg-black/50`,
`bg-black/80`) and sunken wells (`bg-black/20`, `bg-black/30`); both should stay dark in both
themes, so nothing needs to flip.

---

## Typography

**One typeface: Inter**, self-hosted, variable weight axis, latin + cyrillic subsets only (65 KB).

The app had declared `font-family: 'Inter'` since the beginning but never loaded the face, so
every user was reading it in whatever `system-ui` resolved to. Metric columns did not align
because the fallback lacked tabular figures.

Use the scale classes, not ad-hoc size/weight pairs. Each fixes size, weight **and leading**
together — a heading with body leading is the most common way a type scale drifts.

| Class | Size | Use |
|---|---|---|
| `.t-display` | 36px | one number that is the whole point of the screen |
| `.t-h1` | 28px | page title |
| `.t-h2` | 22px | section |
| `.t-h3` | 18px | card heading |
| `.t-body` | 15px | default |
| `.t-small` | 13px | supporting |
| `.t-caption` | 12px | hints, timestamps |
| `.t-label` | 11px | uppercase field/section labels |
| `.t-metric` | — | **any number that ticks or sits in a column** |

`.t-metric` sets `font-variant-numeric: tabular-nums`. Use it on every timer, counter and metric:
proportional figures re-flow the row each time a digit changes width, which is why the timers used
to jitter.

---

## Space, radius, elevation, motion, layering

**Space** — `--gq-space-1` … `--gq-space-16`, a 4px base (4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 ·
48 · 64). Matches Tailwind's own scale, so `p-4` and `var(--gq-space-4)` are the same 16px.

**Radius** — `xs` 4 · `sm` 6 · `md` 8 · `lg` 12 · `xl` 16 · `2xl` 20 · `full`.

**Elevation** — `shadow-e1` … `shadow-e4`. Lighter on the light theme, where a dark-theme shadow
reads as dirt rather than as height. Above e4 is a modal, not a card.

**Motion** — `instant` 90ms · `fast` 160ms · `base` 240ms · `slow` 360ms, with
`ease-standard/out/in`. Short on purpose: this app is used by people who lose the thread while
waiting for a transition.

`prefers-reduced-motion` is honoured **globally**, once, in `index.css`. Individual components do
not opt in — previously each had to remember, and most did not. Animations collapse to a single
frame rather than being removed, so anything relying on `animation-fill-mode` still lands in its
final position.

**Layering** — `z-raised` 10 · `z-sticky` 20 · `z-nav` 30 · `z-drawer` 40 · `z-overlay` 50 ·
`z-modal` 100 · `z-toast` 110. A raw `z-50` cannot be reasoned about; these can.

---

## Cascade order

Named component classes (`.glass-card`, `.t-*`, `.anim-*`) live in `@layer components`.

Tailwind emits `base → components → utilities`, so **a utility always beats a component class**.
This matters: defined as plain CSS after `@tailwind utilities` — as `index.css` used to be —
`.t-caption { color: … }` would silently out-rank `.text-cyan-400` on the same element, and
`.glass-card`'s background would out-rank `bg-cyan-400/10`. Same specificity, later wins, and
"later" was the wrong answer. `check:theme` guards this.

---

## Writing a component

```tsx
// Prefer semantic names.
<p className="t-small text-[var(--gq-text-tertiary)]">…</p>
<span className="text-danger">Просрочено</span>
<div className="glass-card rounded-2xl p-4">…</div>

// Hue names are fine where the colour is decorative, not semantic.
<Icon className="text-purple-400" />
```

Rules:

1. **No literal colour, duration or radius** in a component. If a value is missing from the
   tokens, add it to the tokens.
2. **Semantic over hue** whenever the colour carries meaning. `text-danger`, not `text-red-400`.
3. **`.t-metric` on every number** that ticks or aligns.
4. **Glass is a material, not the language.** `.glass-card` is a treatment for elevated surfaces,
   not the default wrapper for everything.
5. **Motion earns its place** by showing a state change the user caused.

---

## Migration state

The token layer is complete and every utility resolves through it. Call-site migration to the
semantic vocabulary is deliberately incremental — 163 `.glass-card`, 297 `text-gray-*` and ~500
accent utilities all render correctly today via the Tailwind bridge, so there is no functional
pressure to rewrite them, and a mass find-and-replace across 19 pages would be unverifiable churn.

Migrated so far: the Today surface, `PageHeader`, `BentoCard`, `RadialGauge`, `TagPill`.

Remaining, in rough priority order:

- Screens, as they are touched for other reasons — Phase 6 (accessibility) will pass through most
- `--text-main` / `--text-muted` / `--accent-*` aliases removed once their last consumer moves
- `.glass-card` call sites that want a semantic elevation instead of the glass material
