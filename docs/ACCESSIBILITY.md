# Accessibility

Target: **WCAG 2.2 Level AA**.

Three gates enforce it, and all three run in CI:

```
npm run lint            # oxlint's jsx-a11y plugin — what is visible in the source
npm run check:a11y      # focus, dialogs, viewports, axe — what only exists at runtime
npm run check:contrast  # every ink token against both surfaces of both themes
```

---

## What the audit found

The app had **3 `aria-hidden`, 1 `sr-only`, 0 `tabIndex`, 0 `aria-current`**, no skip link, and no
focus trap anywhere. Enabling oxlint's jsx-a11y plugin — which the project shipped with but had
never turned on — reported **75 findings**. All 75 are now resolved or explicitly, individually
justified.

| Rule | Was | Now |
|---|---|---|
| `no-static-element-interactions` | 20 | 0 |
| `click-events-have-key-events` | 18 | 0 |
| `label-has-associated-control` | 13 | 0 |
| `no-autofocus` | 13 | rule off, all 13 audited (below) |
| `prefer-tag-over-role` | 4 | rule off, reasoned (below) |
| `control-has-associated-label` | 3 | 0 |
| `no-noninteractive-element-*` | 4 | 0 / rule off (below) |

---

## One modal, on the platform

Every overlay used to be a hand-rolled
`<div class="fixed inset-0 z-50" onClick={close}>` with a `stopPropagation` child. That pattern
gets six things wrong at once, and got all six wrong in all eight places:

- no focus trap — Tab walked out of the dialog into the page behind it
- no Escape — the only exit was finding the ✕ with a pointer
- focus was not restored on close, so a keyboard user landed back at `<body>`
- background content stayed reachable by assistive technology
- no `role="dialog"`, so nothing announced it as one
- z-index by guesswork — `z-50` eight times, plus a `z-[110]`

`src/components/Modal.tsx` replaces all of them with the native `<dialog>` element and
`showModal()`, which fixes all six *in the platform*: focus trapped, Escape handled, focus
restored, background inert, role implicit, and rendering in the top layer where z-index does not
apply. Hand-rolling any of that would be strictly more code doing a strictly worse job.

**One thing the platform does not do here.** `showModal()` restores focus to the opener on close —
but only if the dialog is still in the document when the UA gets there. Every call site renders
conditionally (`{open && <Modal …/>}`), so closing sets state, React unmounts synchronously (close
and cancel are discrete events), and the UA has nothing left to restore from: focus lands on
`<body>`. `Modal` therefore captures the opener **before** calling `showModal()` — capture it
afterwards and you record the dialog's own first control — and restores it in cleanup.

`npm run check:a11y` caught this, and then caught the capture-ordering bug in the first fix.

**Not migrated, deliberately:** `HyperfocusOverlay`. It is a full-screen focus mode with its own
exit flow, not a dismissible dialog; forcing it into `Modal` would make it worse.

---

## Three rules turned off, with reasons

Turning a rule off is a decision, not a shortcut, so each one is recorded in `.oxlintrc.json`
beside the rule and repeated here.

**`no-autofocus`** — the rule cannot distinguish `autofocus` on page load (bad: steals focus the
user did not ask to move) from `autofocus` inside a panel the user just opened (correct: it is how
HTML expresses initial focus). All 13 uses were audited individually. Every one is behind a
user-initiated reveal:

| Site | Trigger |
|---|---|
| `TagChips` | user clicked "add tag" |
| `StepRow` ×3 | inline edit / note editor / tag editor opened |
| `GoalDescription` | edit mode entered |
| `MindMap` inbox | inbox panel opened |
| `MindMapNode` | inline rename started |
| `Finance` PIN | the lock screen is the only thing on screen and typing is its only action |
| `Gym`, `tests` ×2 | form revealed by a button |
| `TaskInput` | takes it as a prop; both callers pass it only on an opened form |

A blanket removal would make the app worse for exactly the users it is meant to help. If the rule
ever learns the distinction, turn it back on.

**`no-noninteractive-element-to-interactive-role`** — it rejects `<ul role="listbox">` and
`<li role="option">`, which is the ARIA Authoring Practices listbox pattern verbatim and is
explicitly permitted by ARIA in HTML. The command palette is a combobox; there is no compliant
alternative the rule would accept. `no-static-element-interactions` stays on and still catches a
bare `div` with a handler.

**`prefer-tag-over-role`** — a style preference, not a WCAG requirement, and wrong in both places
it fires: it proposes `<select>` for the command palette's listbox, and a real `<button>` for a
MindMap node card that contains an `<input>` during inline rename — invalid nesting that browsers
silently reparent.

---

## Keyboard

- **Skip link** to `#main`, first in the tab order, visible on focus. `top` moves rather than a
  transform, so it cannot land under a sticky header (WCAG 2.2 §2.4.11).
- **Focus ring**: one `:focus-visible` outline for the whole app, defined once in `index.css`.
  `:focus-visible` rather than `:focus`, so a pointer click leaves no ring while every keyboard
  path shows one.
- **Cognitive tests** are now fully keyboard-operable. The Schulte table, the reaction target, the
  memory grid and the game field were all clickable `<div>`s. These measure reaction time and
  working memory, not mouse skill — requiring a pointer excluded the users the tool exists for.
- **Kanban** has ◄ ► move buttons alongside drag. They are now named per card
  (`Переместить «…» вперёд`) and the result is announced through an `aria-live="polite"` region:
  a pointer user watches the card move, a screen-reader user previously got nothing.
- **MindMap** node cards are reachable and operable with Enter/Space. The colour swatches are named
  in words rather than by colour alone.
- **Command palette** is a proper combobox: `role="combobox"` + `aria-activedescendant`, arrow keys
  driving selection, focus never leaving the input. The nested `<button>` inside each option was
  removed — an option may not contain another interactive element, and a focusable child fights
  `aria-activedescendant` for the ring.

---

## Forms

Every label is now associated with its control by `htmlFor`/`id`. Segmented button groups
(difficulty, sphere, energy, priority, programme day) are `<fieldset>` + `<legend>` with
`aria-pressed` on each segment, so both the group's purpose and each button's state are announced.

Icon-only and colour-only controls carry real names. The Finance palette swatches and the MindMap
colour dots previously had colour as their only label — unusable to a screen reader, and to anyone
who cannot separate those hues.

`NodeInspector` uses `useId` for its field ids: it renders per selected node, so a fixed id would
have let a second inspector steal the first one's labels.

---

## Motion

`prefers-reduced-motion` is honoured **globally**, once, in `index.css`. Previously each animation
had to remember to opt out and most did not. Animations collapse to a single frame rather than
being removed, so anything relying on `animation-fill-mode` still lands in its final position.

---

## Responsive

Verified with no horizontal overflow at **320 / 375 / 390 / 430 / 768 / 1024 / 1280 / 1440**.

Widths hard-coded wider than a 320px viewport are caught statically by `check:a11y`, which scans
every component — the runtime sweep can only measure what the fixture renders, but a fixed 400px
box in a 320px viewport overflows deterministically and needs no render to prove. Fixed: the
Schulte table (`w-[400px]` → fluid square), the memory grid (`w-72` → fluid), the MindMap inbox,
and the test cards' `p-8`, which left 256px of content on a phone.

---

## Known limits — stated, not papered over

**Coverage is partial and the reason is structural.** Nearly every screen sits behind Clerk auth.
Shipping an auth bypass so a test can log in is a real security surface, deliberately kept out of
the repository. So `check:a11y` covers:

- the shared interaction primitives, mounted directly (`scripts/a11y/fixture.tsx`)
- the unauthenticated app shell
- static width analysis across all 68 components

It does **not** yet run axe over each authenticated screen. That needs the authenticated E2E
harness and is Phase 7 work. Until then, per-screen contrast on user-chosen colours (Finance
category swatches, MindMap node colours) is also unverified — those are the one place the token
contrast gate cannot reach, because the user picks the value.

Also outstanding:

- MindMap has no keyboard alternative for *repositioning* nodes by drag. Nodes can be selected,
  opened, recoloured and deleted from the keyboard; moving them on the canvas still needs a
  pointer. A "move to…" affordance is the obvious fix and is not done.
- Touch target sizes have not been audited against WCAG 2.2 §2.5.8 (24×24 minimum).
- No reduced-transparency handling; the glass surfaces stay translucent regardless.
