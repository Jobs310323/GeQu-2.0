## Setup

No provider wrapper is required — every component reads plain CSS custom
properties, not React context. The one thing that matters: **theme is a
class on the root element, not a prop.** Dark is the default (`:root`); for
the light theme, add `class="light"` to the element that wraps your
composition (mirrors the app's own `document.documentElement.className =
'light'`). Never invent a `theme` prop — components don't take one.

Fonts: body copy is Inter (the default); headings and big numerals use
Manrope via the `.gq-display` class (`Heading` and `PageHeader` apply it
automatically). Manrope loads from a runtime font service, not the bundle —
just use `.gq-display`, don't add your own `@font-face`.

## Styling idiom

This system is **not** a utility-class design language. Each component is a
typed wrapper around one hand-written CSS class (or a couple, chosen by a
`variant` prop) that already encodes color, radius, spacing and states —
compose with props and children, don't add Tailwind utilities to restyle a
component's own surface. Reach for Tailwind only for outer layout (flex/grid/
gap) around these components, never to override their look.

Real class vocabulary (defined in the bound `styles.css`import closure —
edit nothing, just recognize these when reading a card):

| Class | Used by |
|---|---|
| `.gq-btn` / `.gq-icon-btn` | `Button` variant `primary` / `icon` |
| `.gq-chip` | `Button` variant `ghost`, `Chip` |
| `.gq-glass` / `.glass-card` | `Card` variant `glass` / `legacy` |
| `.gq-input` | `Input`, `Textarea`, `Select` |
| `.gq-stat` | `StatTile` |
| `.gq-tab` (+ `.active`) | `TabStrip`, `GqTabs` |
| `.gq-heading` + `.gq-display` | `Heading`, `GqPageHead`, `PageHeader` titles |
| `.gq-track` | `ProgressBar`, `Slider` track |
| `.gq-divider` / `.gq-row` | `Divider`, `ListItemRow` |
| `.gq-muted` | secondary/caption text |

For a one-off tint that isn't a component prop, use the token directly —
`style={{ color: 'var(--gq-text-2)' }}` or an arbitrary-value Tailwind class
`bg-[var(--gq-glass-bg)]`. Semantic tokens: `--gq-grad-a`/`--gq-grad-b` (the
brand gradient — every primary action and accent), `--gq-text` /
`--gq-text-2` / `--gq-text-muted` (body copy, three weights), `--gq-good` /
`--gq-warn` / `--gq-bad` (status color, both a flat and a `-strong` variant
for text-on-tint). Never hardcode a hex that has a token — every token is
theme-aware, a hardcoded color is not.

## Where the truth lives

`styles.css` → `@import`s `design-tokens.css` (all `--gq-*` custom
properties, both themes) then `gq-components.css` (every `.gq-*` class
above) then `_ds_bundle.css` (component-scoped rules). Read those two files
before inventing a new class or color — the vocabulary above is exhaustive
for the components in this sync, not for the whole app. Per-component docs
are each `<Name>.prompt.md`.

## Composing

```tsx
import { Card, Heading, ProgressBar, Button, TagChips } from '@gequ/design-system';

function GoalCard() {
  return (
    <Card variant="glass" className="p-4 rounded-2xl flex flex-col gap-3">
      <Heading level={2}>Утренняя пробежка</Heading>
      <ProgressBar value={68} fill="gradient" />
      <TagChips tags={['спорт', 'утро']} onChange={() => {}} />
      <Button variant="primary" icon="check">Отметить выполненным</Button>
    </Card>
  );
}
```

`Card`/`Heading`/`ProgressBar` etc. carry their own look end to end — the
only authored classes above (`p-4 rounded-2xl flex flex-col gap-3`) are
Tailwind layout utilities on the outer `Card`, exactly the boundary this
system expects.
