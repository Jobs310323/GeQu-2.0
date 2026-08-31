# ADR-002 — State: Zustand domain stores

**Status:** Accepted · 2026-08-28

## Context

`GequApp` (`src/App.tsx:33-184`) holds 18 `useState` hooks and 18 corresponding persistence
`useEffect`s. Every page receives its slice by prop drilling (`UserCard` takes 11 props,
`Dashboard` 13). Any state change re-renders the root and re-constructs all 19 page elements in
the `PAGES` record.

## Decision

Adopt **Zustand**, with **one store per domain** and selector-based reads.

```
src/stores/
  app-ui.store.ts     user.store.ts      tasks.store.ts
  habits.store.ts     journal.store.ts   finance.store.ts
  cognitive.store.ts  insights.store.ts
```

**Global state only when** it is needed by several distant components, must survive navigation, or
is genuinely application-level.

**Local state stays local:** modal open/closed, transient form state, hover, ephemeral selection,
local tab index, animation state.

Persistence moves out of the 18 `useEffect` blocks and into store middleware over the repository
layer (ADR-003). Components read through selectors so a write in one domain cannot re-render
another.

## Consequences

**Positive.** `App.tsx` becomes a shell; prop drilling disappears; changing one domain no longer
re-renders the app; state becomes testable without React; the extraction is incremental — one
domain per commit, with the remaining `useState` hooks working unchanged throughout.

**Negative.** One dependency (~1 KB). A discipline risk: Zustand makes it easy to accumulate a
single global bag of everything. The domain-per-store rule and the local-state list above exist
specifically to prevent that, and are enforced in review.

## Alternatives considered

**Redux Toolkit.** More structure and better devtools, but substantially more ceremony and bundle
for an app with no complex async orchestration.

**React Context per domain.** No dependency, but context has no selector mechanism — every
consumer re-renders on any change to its context value, which is the problem being solved.

**Keep `useState`, add `useMemo`/`memo`.** Treats the symptom. The state would remain welded to the
page tree, blocking the IA rework.
