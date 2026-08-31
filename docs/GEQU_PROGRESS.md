# GeQu 2.0 — Transformation Progress

Updated after every phase. A phase is marked complete only when its validation gate has actually
run and passed — not when the code was written.

**Validation gate (every phase):** `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`

---

## Phase 0 — Repository audit

**Status:** Complete

**Completed**
- Full read of `package.json`, `tsconfig*`, `vite.config.ts`, `tailwind.config.js`, `vercel.json`,
  `index.html`, `api/`, and all of `src/` (19 pages, 6 feature modules, 15 lib modules, both
  design layers).
- `docs/GEQU_ARCHITECTURE_AUDIT.md` — 12 sections: current architecture, technical debt, UX debt,
  IA problems, security/privacy, performance, accessibility, PWA/offline, data model, migration
  order, decisions, per-change risk.
- `docs/PRODUCT_PRINCIPLES.md` — the loop, the decision test, ten product commitments, definition
  of done.
- `docs/adr/` — ADR-001 routing, ADR-002 state, ADR-003 local persistence, ADR-004 sync,
  ADR-005 design system, plus an index.

**Files changed** — `docs/GEQU_ARCHITECTURE_AUDIT.md`, `docs/PRODUCT_PRINCIPLES.md`,
`docs/adr/README.md`, `docs/adr/ADR-00{1..5}-*.md` (all new), `package-lock.json` (see below).
No application source touched.

**Dependencies added** — none

**Unblocking fix — `package-lock.json`**

The lockfile pinned 302 packages to `https://registry.npmmirror.com/`. That host is unreachable
from a standard environment behind a restrictive network policy (403 on CONNECT), so `npm ci`
failed outright and no validation gate could run. Rewrote those `resolved` URLs to
`https://registry.npmjs.org/`. The mirror serves byte-identical tarballs, so every `integrity`
hash is unchanged and `npm ci` verifies them — this changes where packages are fetched from, not
what is installed. `npm ci` now succeeds (547 packages).

**Baseline measurements** (post-install, before any source change)

| Gate | Result |
|---|---|
| `npm run lint` | passes — 2 `unicorn/no-useless-fallback-in-spread` warnings (`Gym.tsx:506`, `cloud.ts:50`). Note: with the config still misnamed `_oxlintrc.json`, these are oxlint defaults, not project rules |
| `npm run typecheck` | **script does not exist** |
| `npm test` | **script does not exist** |
| `npm run build` | passes in ~2s |
| Bundle | **one 599.99 kB JS chunk (189.37 kB gzip)** + 57.28 kB CSS. Rolldown emits its own "chunks larger than 500 kB" warning. This is the code-splitting baseline Phase 1 is measured against |
| PWA precache | 6 entries, 642.57 KiB — build assets only, no runtime caching |

**Tests added** — none (no test infrastructure exists yet; it arrives in Phase 7)

**Findings that changed the plan**

The brief's description of the codebase was inaccurate in several places, and the corrections
matter:

| Brief | Reality |
|---|---|
| React.lazy in use | No `lazy`/`Suspense` anywhere — all 19 pages eagerly imported |
| A new `--gq-*` design layer | No `--gq-*` tokens exist; the second layer is `src/concept-v2/` |
| Guest mode, BrainIQ feature | Neither exists |
| Duplicate Stroop / Digit Span | One of each; no duplication to remove, but no scoring layer either |
| Fake IQ mappings to fix | None exist. `lib/clinicalTests.ts` is honest and is a thing to *protect* |
| Finance.tsx ~42K lines | 680 lines (42 KB) |

Three defects the brief did not name, found during the audit:

1. **Timezone corruption (critical).** `new Date().toISOString().split('T')[0]` at 35 sites yields
   the *UTC* date. Users east or west of UTC file entries under the wrong day, silently breaking
   check-ins, streaks, habits and Snowman records. Pulled forward into Phase 1.
2. **Lint config never loaded.** `_oxlintrc.json` is misnamed; oxlint reads `.oxlintrc.json`.
   `npm run lint` has never applied the project's own rules.
3. **Finance PIN is plaintext**, compared with `===`, and synced to the server inside the state
   blob — presented to the user as protection.

**Risks** — none introduced; documentation only.

**Known limitations** — the audit is a point-in-time snapshot and will drift as phases land. It is
not maintained as a living document; `docs/ARCHITECTURE.md` (Phase 1) takes over that role.

**Next phase** — Phase 1: routing, error boundaries, the timezone fix, and housekeeping.

---

## Phase 1 — Routing, boundaries, timezone fix, housekeeping

**Status:** Complete

**Validation** — `lint` clean (0 errors, 10 warnings) · `typecheck` clean · `build` clean ·
`smoke` 4/4. No `test` script yet; the unit suite arrives in Phase 7 and this report does not
claim otherwise.

### Timezone fix (committed separately, `fix(dates)`)

The audit's critical finding, fixed first because it corrupts records every day it ships.
`new Date().toISOString().split('T')[0]` was used as "today" in 35 places and renders the **UTC**
date. `src/lib/datetime.ts` is now the only sanctioned way to derive a calendar date, and draws
the distinction the code was missing:

| | | |
|---|---|---|
| **Instant** | a moment, full ISO-8601 | `nowInstant()` |
| **Calendar date** | a day in the *user's* timezone, `YYYY-MM-DD` | `todayKey()`, `toLocalDateKey()` |

Both sides of every day comparison go through `toLocalDateKey`, since fixing only the "today"
side would have compared a local day against a UTC-derived one and made things worse. Stored
values are **not** rewritten — day keys are derived at read time, so existing records reinterpret
correctly and there is nothing to migrate and nothing to roll back.

Three related defects fixed in the same pass: `toLocalDateKey` returns a bare `YYYY-MM-DD`
untouched (habit history and reminders store that shape, and `new Date('2026-08-28')` is UTC
midnight, which walks a day backwards everywhere behind UTC); the three separate streak
implementations now share one; `parseDateKey` anchors at local noon so day arithmetic cannot fall
through a DST transition.

Verified under `TZ=` UTC, Pacific/Kiritimati (+14), Pacific/Niue (−11), Europe/Moscow,
America/New_York and Asia/Kathmandu (+05:45). Pacific/Niue reproduces the original off-by-one
directly.

### Routing

React Router 8 (ADR-001 updated from v7 — 8.x is what the registry serves as `latest`, its peer
range matches the pinned React 19.2.7 exactly, and the API used here is identical).

- Every screen has a URL. `React.lazy` per route. `/dashboard` redirects to `/` so the old entry
  point keeps working.
- `AppLayout` holds the shell; the error boundary is keyed by pathname, so navigating away from a
  screen that threw clears it instead of pinning the user on the fallback.
- `RouteError` distinguishes a failed lazy chunk (offline, or a deploy landing mid-session) from
  other failures and offers a reload for it specifically.
- `NotFound` renders inside the layout, so a bad URL keeps the navigation.
- `setPage` prop threading is gone: `Sidebar` uses `NavLink`, `Dashboard` and `Knowledge` use
  `useNavigate`.
- `App.tsx`: **201 → 34 lines**. State moved to `src/app/AppState.tsx` as a faithful transitional
  move — same shapes, defaults and effects — which Phase 3 replaces with per-domain stores.
  Route adapters in `src/routes/pages.tsx` are the only place that knows how a page wants its
  data, so that swap will not touch the pages themselves.

**Bundle** — entry **599.99 kB → 402.44 kB** (gzip **189.37 → 121.99 kB**). Chart.js (202 kB) and
`@xyflow/react` (197 kB) are now separate chunks that load only with the screens that use them.

Note: extracting the finance data model into `src/features/finance/types.ts` was necessary for
this, not cosmetic. The app's initial state imported `DEFAULT_FINANCE` from the Finance *page*,
which pulled the page and Chart.js into the entry bundle and briefly made it **larger** (635 kB)
after splitting.

### Two bugs found by fixing the lint config

`_oxlintrc.json` was misnamed, so `npm run lint` had never loaded the project's rules. Renaming it
to `.oxlintrc.json` immediately surfaced two `react-hooks/rules-of-hooks` **errors** in
`GymHome` — two `useState` calls sitting *below* an early return. Creating your first program
changed the hook count between renders, so React threw and the screen crashed. Hooks hoisted above
the empty state; lint is now error-free.

### Housekeeping

Removed `src/App.css` (never imported, referenced four variables that do not exist), three Vite
starter assets, and the `dagre`/`@types/dagre` dependency (zero usages). Real `README.md`.
`index.html` `lang="en"` → `"ru"` to match the interface; Phase 11 makes it locale-driven.

**Files changed** — new: `src/lib/datetime.ts`, `src/app/AppState.tsx`, `src/routes/{router,AppLayout,pages,RouteError,NotFound,RouteFallback}.tsx`, `src/components/ErrorBoundary.tsx`, `src/features/finance/types.ts`, `scripts/smoke.mjs`, `README.md`. Modified: `App.tsx`, `Sidebar.tsx`, `lib/nav.ts`, `package.json`, `index.html`, 23 files for the date fix. Deleted: `src/App.css`, `src/assets/{hero.png,react.svg,vite.svg}`. Renamed: `_oxlintrc.json` → `.oxlintrc.json`.

**Dependencies** — added `react-router` (8.3.0), `playwright` (dev, 1.62.1). Removed `dagre`, `@types/dagre`.

**Scripts added** — `typecheck`, `smoke`.

**Tests added** — none as automated tests. Verification was a throwaway Playwright harness driving
all 19 routes plus deep links, refresh, 404, back/forward and the `/dashboard` redirect, all clean.
That harness needed an auth-bypass entry point, which is not something to keep in the repository,
so what is committed is `scripts/smoke.mjs` — the subset checkable without signing in. Phase 7
adds the real suite.

**Risks**

- `AppState` is one context, so any change to it re-renders every consumer. That is no worse than
  the `GequApp` it replaces (which re-rendered and re-constructed all 19 page elements), but it is
  not the fix. Phase 3 is the fix.
- Route-level `Suspense` uses a plain spinner. Fine for chunks this small; screens with slow data
  need real skeletons, which belongs with the Today work in Phase 4.
- `/concept-v2` is still intercepted in `main.tsx` before the router sees it. Untouched here on
  purpose; Phase 5 merges and removes it.

**Known limitations**

- Nothing yet verifies the timezone fix automatically. The evidence is a manual run across six
  timezones; Phase 7 turns it into unit tests, and until then a regression here would be silent.
- Pages are still `({ ... }: any)`. The route adapters type as far as the pages allow and no
  further — Phase 2.
- The IA is unchanged: 19 flat routes. Re-parenting under Today / Plan / Track / Insights /
  Brain / Profile is Phase 4; the flat paths become redirects then.

**Next phase** — Phase 2: TypeScript strict migration.

## Phase 2 — TypeScript strict

**Status:** Complete

**Validation** — `lint` clean (0 errors, 8 warnings) · `typecheck` clean · `build` clean ·
`smoke` 4/4.

### The finding that shaped the phase

Turning on `strict` produced **zero errors**. With 291 explicit `any` annotations the flag had
nothing to bite on — the codebase was not accidentally loose, it was explicitly loose. The safety
only arrives as the `any`s come out, so the phase is mostly deletion, not configuration.

Final state: **`strict`, `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess` and
`exactOptionalPropertyTypes` all on, with zero type errors and zero `: any` remaining in code.**

### What was built

- **`src/types/domain.ts`** — the shapes the app actually persists, derived from the code that
  writes them rather than designed fresh. Every optional field is optional because stored records
  genuinely lack it.
- **`src/types/props.ts`** — a prop contract per screen and per shared component. Setters are
  typed as React state setters because that is what they are today; Phase 3 narrows them to store
  actions.
- **`src/lib/nonEmpty.ts`** — `NonEmptyArray<T>`, `isNonEmpty`, `randomOf`, `lastOf`.
  `noUncheckedIndexedAccess` is right about data-driven arrays and noise about fixed constants
  like the three Snowman spheres or the four Stroop colours; declaring those as non-empty keeps
  the guarantee in the type instead of asserting it away with `!` at each call site.
- **`errorMessage(e, fallback)`** in `lib/helpers` — `catch` binds `unknown` under `strict`, and a
  thrown value need not be an `Error`. Eight `catch (e: any)` blocks reaching for `.message` now
  narrow once, here.
- **`DB.get<T>(key, def)`** typed, which immediately surfaced 23 untyped read sites, including
  four cached AI payloads that had no declared shape at all.

### Bugs found by typing

| Bug | Effect |
|---|---|
| **`WorkoutExercise` conflated two different things** — a program *template* (`sets` is a count, `reps` a range string like `"8-12"`) and a *performed* exercise (`sets` is an array). The same nominal type was both `Array.from({ length: ex.sets })` and `ex.sets.map(...)`. | Split into `ProgramExercise` and `WorkoutExercise`. |
| **Deleting a gym exercise filtered by `id`, which is optional** on exercises imported before ids were written. | Deleting one such exercise would have removed *every* exercise with no id. Now index-based. |
| **`WorkoutSet` was missing cardio `intensity`** despite it being written and read. | Silent data field with no type. |
| **`ActiveWorkoutView` rendered `exercises[activeExIdx]` unguarded.** | A program day with no exercises produced a broken form; now an empty state. |
| **Two cached-payload types were wrong in the source** — `weekSummary.summary` and `usercard.card` hold structured AI objects, not strings. | Caught while writing the types. |

### The two flags, assessed rather than assumed

`noUncheckedIndexedAccess` earned its place: it produced 33 errors, several of them real
"this could be undefined at runtime" cases (`forecastTomorrow`'s weakest sphere, the roulette's
pick, `chapterFor`'s fallback, the Fisher–Yates swap in Schulte).

`exactOptionalPropertyTypes` produced only 13, nearly all in our own code, and the fix is to state
what was already true (`customQuestion?: string | undefined` — the field is written as an explicit
`undefined`, not omitted). Two touched third-party types and got real fixes rather than casts:
`RequestInit.signal` is now spread in conditionally, and `edgeStyle` returns `CSSProperties`
instead of `Edge['style']`.

**Files changed** — new: `src/types/domain.ts`, `src/types/props.ts`, `src/lib/nonEmpty.ts`.
Modified: `tsconfig.app.json`, `src/lib/{db,profile,xp,helpers,clinicalTests,taskTree,useDragReorder,prefs,ai}`, `src/app/AppState.tsx`, all 19 pages, `features/{gym,training,snowman,dopamine,hyperfocus,charts}`, `src/types/{goals,mindmap}.ts`.

**Dependencies added** — none.

**Tests added** — none. This phase moved a large amount of code with no test net, which is the
single largest risk carried forward; Phase 7 closes it.

**Risks**

- The prop contracts describe how pages are called *today*, threading setters. That is honest but
  temporary — Phase 3 replaces them with store actions, and the interfaces narrow rather than
  disappear.
- `DB.get<T>` is an assertion about stored data, not a validation of it. Nothing checks that a
  parsed record actually matches `T`. That is defensible for data this app wrote itself and is
  exactly what schema versioning and validation address in Phase 8; until then a hand-edited or
  migrated `localStorage` value can still lie to the type system.

**Known limitations**

- `src/concept-v2/` is excluded from this pass. It is a preview app scheduled for merge-and-delete
  in Phase 5, so typing it would be work thrown away.
- The four remaining lint warnings are pre-existing (`exhaustive-deps` in the n-back timer and the
  goals memo, `only-export-components` in two files). None is a correctness bug; they are recorded
  rather than silenced.

**Next phase** — Phase 3: extract `AppState` into per-domain Zustand stores.

---

## Phase 3 — Domain stores

**Status:** Complete

**Validation** — `lint` clean (0 errors) · `typecheck` clean · `build` clean · `smoke` 4/4, plus a
browser pass over all 19 routes and two storage-behaviour checks (below).

### What changed

`src/app/AppState.tsx` — the transitional context from Phase 1, holding 18 `useState` hooks and 18
persistence effects — is **deleted**. In its place, nine domain stores under `src/stores/`:

| Store | Holds |
|---|---|
| `checkins` | day logs — the record at the centre of the loop |
| `tasks` | kanban + goals |
| `habits` | habits, with `toggle(id, date?)` |
| `journal` | diary entries |
| `cognitive` | exercise results, achievements, screening results, CBT records, circles |
| `body` | gym data, Snowman labels and days |
| `finance` | finance data |
| `calendar` | reminders |
| `app-ui` | theme, prefs, dopamine menu, pomodoro, hyperfocus, roulette |

`src/stores/derived.ts` holds the values computed across stores — energy, level, today's log — as
hooks that subscribe only to the slices they read, so a journal edit does not recompute energy.

`App.tsx` now has no state at all. The Pomodoro countdown moved to `src/app/Pomodoro.tsx`, a
render-nothing ticker mounted in the shell, so navigating away still cannot pause a running timer.

### The decision that mattered: not using zustand's `persist`

Zustand's own `persist` middleware wraps stored values as `{ state, version }`. Adopting it would
have changed the on-disk format of every `gequ_*` key — and `lib/cloud.ts` sweeps those keys **raw**
and ships them to the server as-is. The format change would have corrupted the stored data of every
existing user and every other device already holding it, silently, on first write.

So `src/stores/persist.ts` hydrates from the existing key and mirrors changes back unchanged. The
refactor is invisible to storage and to sync. Phase 8 swaps `DB` for the repository layer in that
one file.

Two behaviours were verified in a browser rather than assumed:

- Adding a habit writes `gequ_habits` as a **raw array** — `[{"id":…,"name":"…","history":[]}]` —
  with no wrapper.
- That same action writes **exactly one** key. `persistSlice` compares by reference, so a change in
  one domain does not rewrite its neighbours (which would also mean spurious cloud pushes).

### Store discipline

Global state only where it is needed by distant components, must survive navigation, or is
application-level. Modal open/closed, in-progress form state, hover, selection and local tab index
stay in the component. The rule is written into `app-ui.store.ts` because that store is where the
temptation to accumulate a global bag actually lives.

Store actions accept the `useState` contract (a value *or* an updater), via `stores/setter.ts`.
That is deliberate: screens need `setTasks(prev => …)` to derive from current state without closing
over a stale copy, and it means a screen can move between local state and a store without being
rewritten.

**Files changed** — new: `src/stores/*` (12 files), `src/app/Pomodoro.tsx`. Rewritten: `src/App.tsx`, `src/routes/{AppLayout,pages}.tsx`. Deleted: `src/app/AppState.tsx`.

**Dependencies added** — `zustand` 5.0.15 (~3 kB).

**Tests added** — none automated. Phase 7.

**Bundle** — entry 402.55 → 431.58 kB (gzip 122.05 → 133.27). The growth is zustand plus the
stores plus `lib/xp.ts`, which is now shell-level because the sidebar always renders level and
energy. Chart.js and `@xyflow/react` remain separate chunks.

**Risks**

- The route adapters in `routes/pages.tsx` are now the seam between stores and screens. They are
  typed against each page's real props, so a mismatch is a compile error rather than a blank panel
  — but they are still passing whole collections down, which is why the entry bundle grew rather
  than shrank. Phase 4 narrows them to intent-named actions per screen.
- `derived.ts` recomputes energy and level on every relevant store change with no memoisation.
  Cheap today (the datasets are small); worth measuring in Phase 4 when Today reads them
  continuously.

**Known limitations**

- Screens still receive `set*` props rather than domain actions (`addTask`, `completeHabit`). The
  stores expose those actions already; the screens have not been reworked to use them, and doing so
  belongs with the Phase 4 screen-by-screen rework rather than as a mechanical rename now.
- Sign-in still triggers a full page reload to re-seed state after a cloud pull
  (`CloudSync.tsx:52`). Stores hydrate at import, so the reload is still how a different account's
  data gets in. Removing it needs the sync engine — Phase 8.

**Next phase** — Phase 4: Today, Quick Capture, the new IA, and onboarding.

---

## Phase 4 — Today, Quick Capture, the new IA, onboarding

**Status:** Complete

**Validation** — `lint` clean · `typecheck` clean · `build` clean · `smoke` 4/4, plus a browser pass
over the 21 new routes, the 5 legacy redirects, the palette, the Today surface, mobile at 390px,
and the onboarding personalisation.

### The IA

Six sections, shaped by the user's question rather than the app's feature list:

```
TODAY     what now          PLAN      what next
TRACK     what is happening INSIGHTS  what it means
BRAIN     how my thinking is doing    PROFILE  who this is about
```

All nineteen previous destinations are still here — they stopped competing at the top level and
became sub-routes. Every pre-2.0 path redirects rather than 404ing, because bookmarks, the old PWA
start URL and the knowledge base's own internal links all point at them. `findById` additionally
aliases the one **id** that changed (`dashboard` → `checkin`), which a link check caught before it
could silently send readers to the home screen.

### Today

`src/features/today/` answers four questions and deliberately nothing else: a three-number state
strip, one next action, up to three priorities, one habit, one observation.

**`NextAction` picks exactly one thing, never a list** — offering three "next actions" hands the
decision straight back, which is the friction the surface exists to remove. The order is
deliberate: something already started beats something new, an unstarted urgent task beats a habit,
and closing the day comes last because it is reflection rather than action.

**`TodayInsight` suppresses rather than hedges.** `src/features/insights/observe.ts` is the seed of
the Phase 10 engine and already enforces the two rules that will hold there: below `MIN_SAMPLE`
days on each side of a comparison nothing is reported, and the language states association, never
cause. Every observation shows its sample size next to the claim.

### Quick capture

⌘K / Ctrl+K. Not a search box — `задача купить молоко` files the task and navigates to the board;
free text with no command word still offers the capture actions with that text as the payload,
because the common case is someone who knows what they want to record and not which command records
it. Navigation entries are generated from the nav structure, so a new screen is in the palette the
moment it exists.

Verified end to end in a browser: `Ctrl+K` → type → Enter writes `gequ_kanban` and the new task
then appears as Today's next action.

### Navigation

Desktop: Today pinned above the sections; a section shows its first three screens and expands when
you are inside it. Every group open at once would put the whole app's structure on screen
permanently, which is the thing the IA is trying to stop.

Mobile: a five-target bottom bar (Today · Планы · Дневники · Выводы · Ещё) with the rest in a
drawer. Five because a sixth stops being thumb-reachable at 375px.

### Onboarding

Two questions, then the app — not a tour. A tour teaches the interface; these questions shape it.
The answers hide screens the user did not ask for, so the first session is the small version of
GeQu. Verified that hidden means **hidden, never deleted**: a hidden screen stays reachable by URL
and stays in the command palette.

### Bug found by testing

`selectOpenTasks` was `s => s.kanban.filter(...)` — a selector building a **new array on every
call**. Zustand v5 compares with `Object.is`, so the component re-rendered, the selector ran again,
and React aborted the Today surface with "maximum update depth exceeded". The error boundary from
Phase 1 caught it and rendered a recovery card instead of a white screen, which is how it was
spotted. Replaced with `openTasksOf(kanban)` — a plain function applied in a `useMemo` — and the
store carries a comment explaining the trap so it does not recur.

**Files changed** — new: `src/features/today/{Today,NextAction,TodayHabit,TodayInsight}.tsx`, `src/features/capture/{actions.ts,CommandPalette.tsx}`, `src/features/insights/observe.ts`, `src/features/onboarding/Onboarding.tsx`, `src/components/BottomNav.tsx`. Rewritten: `src/lib/nav.ts`, `src/components/Sidebar.tsx`, `src/routes/router.tsx`. Modified: `src/App.tsx`, `src/routes/{AppLayout,pages}.tsx`, `src/pages/{Settings,Knowledge,Dashboard}.tsx`, `src/stores/tasks.store.ts`.

**Dependencies added** — none.

**Tests added** — none automated. Phase 7.

**Bundle** — entry 431.58 → 452.69 kB (gzip 133.27 → 138.86). Today, the palette and the nav are
shell-level by definition: they must be present before any route resolves.

**Risks**

- Today reads from five stores on every render with no memoisation beyond `openTasksOf`. Fine at
  current data sizes, but it is now the most-rendered component in the app and the first place to
  measure when Phase 6 does the performance pass.
- The palette's expense capture files an uncategorised entry. That is the intended trade — the
  number is recorded before it is forgotten, categorising it is a later decision — but it does mean
  Finance can accumulate uncategorised rows that nothing yet prompts the user to sort.

**Known limitations**

- The old day-closing form is now `/today/checkin` but is otherwise unchanged: eleven collapsible
  sections. It works and it is no longer the first thing a user sees, which was the actual problem;
  reworking the form itself is a separate piece of work.
- Onboarding personalisation is one-shot. There is no "I changed my mind" flow beyond Settings'
  per-screen toggles.
- No undo yet on any destructive action — that is Phase 6's recovery work.

**Next phase** — Phase 5: design system consolidation, and merging `concept-v2` away.

---

## Phase 5 — Design system

**Completed**

One token layer (`src/styles/tokens.css`), consumed both directly as CSS variables and through
Tailwind utilities wired to the same tokens. Colour, semantic colour, surface, text, border,
spacing, radius, elevation, typography, motion and z-index. Documented in `docs/DESIGN_SYSTEM.md`.

### The decision that carried the phase: surface vs ink

A hue needs two values, not one. The same `cyan-400` is asked to be both a button fill and body
text, and no single value does both across two themes — a tone light enough to carry black button
text at 40px is far too faint as 13px text on a white page.

So Tailwind's `colors` (fills: `bg-`, `border-`, gradients) and `textColor` (`text-` only) are
given **different** token sets for the same scale name. Fill tones stay stable across themes; ink
tones flip.

That is what let **~25 CSS overrides be deleted outright** with no call site changed. The app is
written dark-first — 124 `text-white`, 297 `text-gray-*`, ~500 accent utilities — and the light
theme had been made legible by out-ranking each utility with a more specific selector
(`:root.light .text-white { … }`, specificity (0,2,0) beating (0,1,0)). The utility's own value is
now a variable that flips with the theme, so there is nothing left to out-rank. A hue added to
both scales is correct in both themes immediately, rather than correct in dark and invisible in
light until someone notices.

### Findings

**Inter was never loaded.** `body { font-family: 'Inter' }` has been in the stylesheet since the
beginning, but there was no `<link>`, no `@font-face` and no package. Every user has read the app
in whatever `system-ui` resolves to — Segoe UI, Roboto, SF — and the metric columns did not align
because the fallback lacks tabular figures. Now self-hosted (`@fontsource-variable/inter`), latin
+ cyrillic only, 65 KB rather than the full 213 KB family. Self-hosted rather than the Google
Fonts CDN: a CDN link leaks every user's IP and referrer to a third party on first paint.

**Tailwind's stock greys fail AA on this canvas.** `gray-500` measured **4.0:1** against the dark
background and was used 87 times for real text. The new five-step ink ramp is checked, not chosen
— every step passes 4.5:1 against *both* surfaces of *both* themes, and `text-subtle` (3:1) is
documented as decoration-only.

**Cascade order was wrong.** Named classes sat after `@tailwind utilities` as plain CSS, so
`.t-caption { color: … }` would have out-ranked `.text-cyan-400` on the same element, and
`.glass-card`'s background would have out-ranked `bg-cyan-400/10` — same specificity, later wins.
Moved into `@layer components`, where Tailwind's `base → components → utilities` order gives
utilities the win. This was latent before the phase: `.glass-card` already had it.

**Five dead CSS classes.** `.note-card` (+ `popIn`), `.fire-glow`, `.lift`, `.node-overdue` (+
`pulseOutline`) had zero consumers — MindMap had re-implemented the overdue outline inline with
Tailwind. Also `animate-fade-in` in `DopamineRoulette.tsx`, which is not a Tailwind class and was
never defined: that element has never animated. Fixed to `anim-fade-in`.

**`concept-v2` was already dead.** Its five components had been ported into `src/components/` and
re-themed onto CSS variables in an earlier pass, so the "merge" step was a verification, not a
migration. 347 lines and the `/concept-v2` branch in `main.tsx` deleted.

**PWA manifest colour was stale.** `theme_color: '#050510'` matched nothing the app paints —
that is the Android status bar. Now `#0A0B0D`, the actual canvas. Workbox's default glob excludes
`woff2`, so the font would not have been precached and the offline shell would have repainted in a
fallback face; added.

### Two gates, because a token layer with no enforcement drifts back within a quarter

`npm run check:contrast` — parses `tokens.css` (it does not carry its own copy of the palette; a
checker with duplicated values stops being a check the first time someone edits one of the two)
and measures every ink token against both the canvas and the **composited** card surface of both
themes. 64 checks.

`npm run check:theme` — drives a real browser against the **built** CSS and asserts what the app
actually resolves to: ink flips with the theme, fill does not, gradient stops stay on the fill
ramp, veils invert, `@layer` order holds, Inter is loaded rather than merely declared, and opacity
modifiers survive tokenisation. 47 checks.

The second gate earned itself immediately by failing twice on its first run — both times because
the *fixture* was wrong, not the app: it asserted on `border-white/10`, a utility that existed
only in the just-deleted `concept-v2` and had therefore been purged, and it tried to measure
contrast against a gradient, which paints no `background-color`. Both are now handled explicitly,
including a purge guard that reports "this utility no longer exists in the source" rather than
letting it read as a colour bug.

**Files changed** — new: `src/styles/{tokens,fonts}.css`, `scripts/{check-contrast,check-theme}.mjs`,
`docs/DESIGN_SYSTEM.md`. Rewritten: `src/index.css`, `tailwind.config.js`, `src/main.tsx`.
Modified: `src/components/{BentoCard,PageHeader,RadialGauge,TagPill}.tsx`,
`src/features/today/*.tsx`, `src/features/dopamine/DopamineRoulette.tsx`, `vite.config.ts`,
`package.json`. Deleted: `src/concept-v2/` (10 files, 347 lines).

**Dependencies added** — `@fontsource-variable/inter` (self-hosted font files only, no runtime
code).

**Tests added** — none unit. Two browser-verified gates (`check:contrast` 64 checks,
`check:theme` 47 checks). Vitest is still Phase 7.

**Bundle** — entry 452.69 → 438.80 kB (gzip 138.86 → 135.13), from deleting `concept-v2`. CSS
51.65 kB / 10.10 gzip. Fonts add 65.4 kB of woff2, downloaded once and precached.

**Risks**

- The `colors` / `textColor` split is powerful and non-obvious. A hue added to `colors` but
  forgotten in `textColor` silently falls back to stock Tailwind hex, which does not flip, and
  light-theme text goes unreadable with nothing failing at build time. `check:theme` exists
  specifically to catch this, but only for the hues listed in its `SAMPLES` — a genuinely new hue
  needs a row added there.
- Contrast is verified against flat and composited surfaces. It is **not** verified against text
  sitting on a user-chosen colour (Finance category swatches, MindMap node colours). Those are
  still unchecked and belong to Phase 6.

**Known limitations**

- Call-site migration is deliberately incremental. 163 `.glass-card`, 297 `text-gray-*` and ~500
  accent utilities render correctly through the Tailwind bridge, so there is no functional pressure
  to rewrite them, and a mass find-and-replace across 19 pages would be unverifiable churn. Only
  the Today surface and the four shared components have moved to the semantic vocabulary so far.
- The `--accent-*` / `--text-main` / `--text-muted` aliases are still live and still the majority
  spelling in the tree. Two vocabularies coexist until Phase 6 passes through the screens.
- The type scale exists and is documented but has 7 call sites. Headings elsewhere are still
  ad-hoc `text-2xl font-bold` pairs.
- `icon.png` is 432 KB for a 192/512 icon and dominates the precache manifest. Unrelated to this
  phase, not fixed, worth a minute in Phase 6.

**Next phase** — Phase 6: accessibility (WCAG 2.2 AA) and responsive. The 15 clickable `<div>`s,
non-drag alternatives for Kanban and MindMap, focus management in dialogs, and the viewport sweep
from 320 to 1440.

---

## Phase 6 — Accessibility + responsive

**Completed**

WCAG 2.2 AA work across the app, with three gates to hold it: `lint` (oxlint jsx-a11y),
`check:a11y` (focus, dialogs, viewports, axe, static width analysis) and the Phase-5
`check:contrast`. Documented in `docs/ACCESSIBILITY.md`.

### The audit

oxlint ships a **jsx-a11y plugin the project had never enabled**. Turning it on reported **75
findings**. All 75 are resolved or individually justified; `npm run lint` now fails on a new one.

Baseline before the phase: 3 `aria-hidden`, 1 `sr-only`, 0 `tabIndex`, 0 `aria-current`, no skip
link, no focus trap anywhere, 68 responsive utilities in the entire app.

### One modal, on the platform

Eight overlays were hand-rolled `<div class="fixed inset-0 z-50" onClick={close}>`. That pattern
gets six things wrong at once — no focus trap, no Escape, no focus restore, background not inert,
no `role`, z-index by guesswork — and got all six wrong in all eight places.

Replaced with one `Modal` built on the native `<dialog>` element and `showModal()`, which fixes
all six *in the platform*. `HyperfocusOverlay` was deliberately left alone: it is a full-screen
focus mode with its own exit flow, not a dismissible dialog.

### Bugs the new gate found in the new code

The a11y gate justified itself twice within minutes of existing, both times against code I had
just written:

1. **Focus was not restored to the opener.** `showModal()` does restore it — but only if the
   dialog is still in the document when the UA gets there. Every call site renders conditionally
   (`{open && <Modal …/>}`), so closing sets state, React unmounts synchronously (close and cancel
   are discrete events), and the UA has nothing to restore from: focus landed on `<body>`. My
   comment in `Modal` had confidently claimed the platform handled it. It does not, for this
   render pattern.
2. **The fix had a capture-ordering bug.** I read `document.activeElement` in the effect — after
   `showModal()` had already moved focus into the dialog — so it recorded the dialog's own first
   control and "restored" focus to an element about to be unmounted. Capture now happens before
   `showModal()`.

### A green result that was not green

`npm run lint` reported **zero** jsx-a11y findings for several minutes while the config was
silently failing to parse: oxlint rejects unknown keys, and I had added a `_notes` object to
document the disabled rules. It fell back to defaults and did not run the plugin at all.

Both new gates are now canary-tested — a deliberate clickable `<div>` and a deliberate
`w-[400px]` were introduced, confirmed to fail, and reverted. A gate that has never been seen to
fail is not known to work.

### Three rules turned off, each with a recorded reason

Not a shortcut — the reasons are in `.oxlintrc.json` beside the rule and in
`docs/ACCESSIBILITY.md`.

- **`no-autofocus`** — the rule cannot distinguish autofocus on page load (bad) from autofocus in
  a panel the user just opened (correct; it is how HTML expresses initial focus). All 13 uses were
  audited individually and every one is behind a user-initiated reveal. A blanket removal would
  have made the app worse for exactly the users it exists for.
- **`no-noninteractive-element-to-interactive-role`** — it rejects `<ul role="listbox">` /
  `<li role="option">`, which is the ARIA Authoring Practices pattern verbatim.
- **`prefer-tag-over-role`** — a style preference, and wrong in both places it fires: it proposes
  `<select>` for a command palette, and a `<button>` for a card that contains an `<input>`.

### Keyboard

- Skip link to `#main`, first in the tab order, `top`-animated so it cannot land under a sticky
  header.
- One `:focus-visible` ring for the whole app.
- **The cognitive tests were mouse-only.** The Schulte table, reaction target, memory grid and
  game field were all clickable `<div>`s. These measure reaction time and working memory, not
  mouse skill — requiring a pointer excluded the users the tool exists for. All now real buttons.
- Kanban's move buttons are named per card and announce the result through `aria-live="polite"`.
  A pointer user watched the card move; a screen-reader user got nothing.
- The command palette is a proper combobox. The nested `<button>` inside each `role="option"` was
  removed — an option may not contain another interactive element, and a focusable child fights
  `aria-activedescendant` for the focus ring.
- `Dashboard` jumped h1 → h3 three times; relevelled.

### Responsive

No horizontal overflow at 320 / 375 / 390 / 430 / 768 / 1024 / 1280 / 1440. Fixed the Schulte
table (`w-[400px]` → fluid square), the memory grid, the MindMap inbox, and 14 test cards whose
`p-8` left 256px of content on a phone.

**Files changed** — new: `src/components/Modal.tsx`, `scripts/check-a11y.mjs`,
`scripts/a11y/{fixture.html,fixture.tsx}`, `docs/ACCESSIBILITY.md`. Rewritten: `.oxlintrc.json`.
Modified: `src/index.css`, `src/routes/AppLayout.tsx`, `src/features/capture/CommandPalette.tsx`,
`src/components/BottomNav.tsx`, `src/features/training/tests.tsx`, `src/pages/{Kanban,Finance,MindMap,Dashboard}.tsx`,
`src/pages/mindmap/{MindMapNode,NodeInspector,colors}.ts(x)`, `src/pages/goals/StepRow.tsx`,
`src/features/gym/{Gym,ProgramImport}.tsx`, `src/features/snowman/*`,
`src/features/dopamine/DopamineRoulette.tsx`.

**Dependencies added** — `@axe-core/playwright`, `axe-core` (dev only).

**Tests added** — none unit. `check:a11y` adds 25 runtime checks plus a static scan over all 68
components. Vitest is still Phase 7.

**Bundle** — entry 438.80 → 438.81 kB. Flat: `Modal` replaced more code than it added.

**Risks**

- `Modal`'s focus restore depends on the opener still being in the document. If a call site
  unmounts the opener as part of the same action, focus falls back to `<body>` silently. The
  guard is `isConnected`, which prevents an exception but not the fallback.
- The `<dialog>` element puts every modal in the top layer, so the app's `z-index` values no
  longer govern overlay stacking. Anything that must sit *above* a modal has to be a dialog too.

**Known limitations**

- **Coverage is partial, and structurally so.** Nearly every screen is behind Clerk auth, and
  shipping an auth bypass so a test can log in is a real security surface. `check:a11y` covers the
  shared primitives, the unauthenticated shell, and static width analysis. It does **not** run axe
  over each authenticated screen — that needs the Phase 7 E2E harness.
- Per-screen contrast on **user-chosen** colours (Finance category swatches, MindMap node colours)
  is unverified. It is the one place the token contrast gate cannot reach, because the user picks
  the value.
- MindMap nodes can be selected, opened, recoloured and deleted from the keyboard, but
  **repositioning still requires a pointer**. The planned "move to…" affordance is not done.
- Touch targets have not been audited against WCAG 2.2 §2.5.8 (24×24 minimum).
- No reduced-transparency handling; glass surfaces stay translucent regardless.

**Next phase** — Phase 7: Vitest + Testing Library + Playwright, the authenticated E2E harness
that closes the coverage gap above, and `.github/workflows/ci.yml` running all six gates.

---

## Phase 7 — Testing + CI

**Completed**

Vitest + Testing Library + jsdom, **196 tests**, and `.github/workflows/ci.yml` running all seven
gates on every PR. Documented in `docs/TESTING.md`.

This closes the risk named at the end of Phase 4: six phases had moved a large amount of code with
browser checks and the typechecker as the only net.

### Coverage is deliberately uneven

The rule is *test what is expensive to get wrong*, not what is easy to reach.

**`lib/datetime.ts` — 100% statements, enforced by a coverage threshold.** This module exists
because of the UTC day-key bug that misfiled entries for every non-UTC user. Every case
reproduces a way that bug manifested, and the suite is **verified to catch it**: reintroducing the
`toISOString().split('T')[0]` shortcut under `TZ=Pacific/Niue` fails two tests.

**CI runs the unit suite under three timezones** — UTC, Pacific/Niue, Pacific/Kiritimati. A
UTC-only matrix would pass with the bug reintroduced, because the runner is UTC. That is the
single most important line in the workflow.

**`lib/clinicalTests.ts` — the highest-stakes code in the app.** Twelve validated instruments with
published scoring rules. A bug here tells someone their depression is "minimal" when the same
answers score "moderately severe" everywhere else. The arithmetic is pinned against the published
rules rather than the implementation's own behaviour, plus four structural invariants checked
across all twelve: reversed/threshold indices address real questions, bands cover `0..maxScore`
with no gap or overlap, `maxScore` matches what `scoreTest` can produce, and every attainable
score resolves to a band. All twelve pass — the honest scoring the Phase 0 audit flagged as worth
protecting is now protected.

**`features/insights/observe.ts`** — the suppression rules. Below `MIN_SAMPLE` an observation is
suppressed, not hedged; effects too small to matter are dropped; the reported direction follows
the data rather than the expected story; no causal verb may appear in the output.

**`stores/persist.ts`** — the layer that kept the Phase 3 refactor from destroying user data.
Asserts the stored format stays a bare value with no `{state, version}` envelope, that a change in
one domain does not rewrite a neighbouring key, and that pre-refactor data rehydrates identically.

**`features/today/Today.tsx`** — the product's editorial rules, made executable: exactly one next
action and never a list, an honest "not enough data" instead of a manufactured insight, unknown
energy as `—` rather than a fabricated `0.0`.

### The coverage threshold earned itself immediately

`datetime.ts` came in at 91.66% lines against a 95% threshold, which surfaced `localTimeZone()` as
completely untested — including its fallback for runtimes shipping without full ICU. Now 100%.

### Two type errors in the tests themselves

`npm run typecheck` covers the test files, and caught both: an `{hindered: undefined}` fixture that
`exactOptionalPropertyTypes` (Phase 2) correctly rejects — an *omitted* key and an explicit
`undefined` are different types, and it is the omitted one that exists in users' stored data — and
an answers array inferred as `number[]` where `scoreTest` takes `(number | null)[]`.

**Files changed** — new: `vitest.config.ts`, `src/test/setup.ts`, `.github/workflows/ci.yml`,
`docs/TESTING.md`, and five suites: `src/lib/{datetime,clinicalTests}.test.ts`,
`src/features/insights/observe.test.ts`, `src/stores/persist.test.ts`,
`src/features/today/Today.test.tsx`. Modified: `package.json`.

**Dependencies added** — `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`,
`@testing-library/jest-dom`, `@testing-library/user-event` (all dev).

**Tests added** — 196, passing under all three CI timezones.

**Bundle** — unchanged; nothing ships.

**Risks**

- CI has never run. The workflow is validated as YAML and every step was executed locally, but
  `npx playwright install --with-deps chromium` and `npm ci` on a clean runner are untested paths.
  The first PR run is the real verification.
- The coverage threshold is set only on `datetime.ts`. Every other module can regress to zero
  coverage without failing anything.

**Known limitations**

- **There is no end-to-end suite, and the reason is structural.** Nearly every screen is behind
  Clerk auth; signing in from a test needs either real credentials in CI or an auth bypass in the
  app, and the second is a security surface deliberately kept out of the repository. The critical
  journey — sign-up → onboarding → check-in → task → habit → journal → offline → sync → account
  deletion — is **not** covered by anything.
- `smoke` proves the app boots and that deep links get the SPA fallback. It does not prove any
  screen works.
- Untested: `lib/{xp,profile,knowledge,cbt,mindTree,taskTree}.ts`, `features/snowman/logic.ts`, the
  finance math, and eight of the nine stores.

**Next phase** — Phase 8 (offline-first, IndexedDB, sync) is the riskiest remaining work: it
migrates every user's stored data. Its data-safety gate needs the authenticated E2E harness that
does not yet exist, so **closing the E2E gap comes first** — a Clerk test-mode user with
credentials in CI secrets, then Playwright specs for the critical journey.

---

## Phase 8 — Sync correctness, then offline-first storage

**Completed** in two commits, deliberately sequenced.

### 8a — the data-loss fix

Re-reading `CloudSync.tsx` for this phase turned up a defect worse than the audit recorded:

```ts
const owner = localStorage.getItem(OWNER_KEY);
if (owner === userId) return;        // never fetched
```

A device only pulled when the **account** changed. Work on the laptop, then the phone (which
pulls, adds tasks, pushes), then reopen the laptop: `OWNER_KEY` still matches, the pull is skipped,
and the first edit pushes the laptop's stale whole-blob snapshot over everything the phone did.
Silently, with no error and no bound on the loss.

The audit called this "last-write-wins". It was **first-device-wins**.

Now: always pull, merge, push conditionally on the version read. `api/state.ts` versions the row
and answers a stale write with **409 plus the winning row**, so the client can merge and retry
rather than being told only that it failed.

`src/lib/merge.ts` reconciles per key — append-only union for records of things that happened
(journal, day logs, assessments, CBT), merge-by-id for live items, deep-merge for finance and gym,
last-write-wins for settings. An unknown key defaults to last-write-wins favouring local, so a key
added by a newer build cannot vanish because this build's policy table has not heard of it.

**Records carry no `updatedAt`**, so a same-id conflict cannot be resolved by recency and this does
not pretend to. That is not where the damage was: the failure that loses data is deletion by
omission, and union by id fixes it completely.

Two supporting fixes: `applySnapshot` now writes first and removes only what the merged snapshot
omits (it used to clear everything up front, so a quota error mid-apply left the user with
nothing); and `window.location.reload()` is gone, replaced by `rehydrateStores()` — it only existed
because state lived in `useState(DB.get(...))` inside components, which has not been true since
Phase 3.

### 8b — storage

`src/data/` is the storage boundary. Writes go to **both** localStorage and IndexedDB; reads still
come from localStorage.

That split is the judgment call of the phase. Reads stay synchronous because every consumer is a
store initialised at module load, and making them async pushes a loading state into the shell
before first paint — real work, justified by nothing the user would notice, for a dataset of a few
hundred KB. But writing to IndexedDB anyway means the data is there, verified, with the migration
proven, so the cutover becomes a one-line change whenever a reason to make it appears. **The risk
is retired without the disruption.**

### The nine-point safety gate is a test file, not a checklist

`src/data/migrate.test.ts`, 21 tests against `fake-indexeddb` with a realistic seeded browser:
old data, new data, partial failure, duplicate and concurrent runs, interruption mid-migration,
offline, backup, rollback, and "nothing is deleted before verification".

The migration never deletes from localStorage — that is what makes rollback a single flag removal.
**Verified by canary:** adding the obvious tidy-up (`verified.forEach(k => localStorage.removeItem(k))`)
fails eight of the twenty-one.

### A gap found while wiring it up

`initStorage()` is intentionally not awaited, so the user can already be typing before the
IndexedDB mirror opens — and on a fresh browser there is no migration to catch those writes either.
Without a catch-up pass, a user's first session would leave IndexedDB permanently behind by
whatever happened in the first few hundred milliseconds. `catchUp()` closes it, with a test.

`/api/state` is registered **NetworkOnly** in workbox. A cached snapshot served to the merge would
look like the server's current state and could push a stale version back over newer data — the
exact failure this phase exists to fix.

**Files changed** — new: `src/lib/merge.ts`, `src/stores/rehydrate.ts`, `src/data/{repository,index,migrate}.ts`,
`docs/{SYNC,DATA_MODEL}.md`, and five suites. Rewritten: `src/components/CloudSync.tsx`,
`src/lib/{cloud,db}.ts`, `api/state.ts`. Modified: `src/stores/persist.ts`, `src/main.tsx`,
`vite.config.ts`.

**Dependencies added** — `fake-indexeddb` (dev only). `idb` was already present via workbox but is
not used: the migration needs raw `IDBRequest` control to verify each write, which the promise
wrapper hides.

**Tests added** — 82 (278 total): merge 29, cloud transport 14, rehydration 6, migration 21,
repository 12.

**Bundle** — entry 438.81 → 441.2 kB. The merge policy and the storage boundary are shell-level;
sync runs on every page.

**Risks**

- **The two-device path cannot be automated.** Real Clerk tokens and a real Postgres row need
  either credentials in CI or an auth bypass in the app, and the second is a security surface kept
  out of the repository. `merge.ts` and the 409 handling are unit-tested against a mocked fetch;
  the six-step manual check in `docs/SYNC.md` is the rest, and it has **not been run** — there is
  no deployed instance in this environment to run it against.
- `api/state.ts` gained an `ALTER TABLE … ADD COLUMN IF NOT EXISTS` that has never executed against
  a real database.
- `rehydrateStores` names every persisted slice by hand. A slice added and forgotten there would
  silently stop refreshing after a sync — the guard test scrapes the store sources and fails naming
  the key, and was canary-verified, but it is regex over source and could be defeated by an unusual
  call shape.

**Known limitations**

- **Deletions can come back.** The merge is a union, so deleting a task on one device while another
  still holds it means it returns. Tombstones are the fix and are not done. Erring toward keeping
  data is the right trade — the behaviour being replaced lost data outright.
- Three or more devices editing simultaneously can produce a second 409 after the retry; the push
  is deferred to the next local change. Nothing is lost.
- Reads have not moved to IndexedDB, and no `updatedAt` exists on records yet.
- No encryption at rest. Highly-sensitive data (journal, screening results, finance) sits in
  plaintext locally and in one JSONB column. Phase 12.

**Next phase** — Phase 9: cognitive engine unification.

---

## Phase 9 — Cognitive engine unification

**Completed**

`src/features/cognitive/` — a registry, a scoring layer, a result envelope, and the twelve
exercises split out of the 1126-line `features/training/tests.tsx` into one file each (largest now
167 lines).

### What was actually wrong

Every exercise ended with `saveResult(setTestResults, 'schulte', 38.4)` — a bare number in a
`value` field. A Schulte time in seconds and an N-back accuracy percentage were stored identically,
with nothing recording what the number meant, which variant produced it, how long the attempt took,
or whether it was completed at all.

That is fine while a human reads one number. It stops being fine the moment anything **compares**
them, which `lib/profile.ts` already did. "Your Schulte improved from 41 to 38" is not a finding
unless both attempts were the same grid, neither was abandoned, and there are enough of them to
distinguish a trend from a good afternoon.

### The honesty constraint, made structural

`referencePopulation` is `'self'` and the tests assert it can be nothing else. These exercises are
not standardised instruments, they run on unknown hardware, and there is no normative sample. So a
percentile means "against your own previous attempts" — and it is **withheld entirely** below five
of them, because a percentile computed from three numbers is arithmetic, not information.

`confidence` tops out at `moderate`. No amount of repetition earns "high" when the conditions are
uncontrolled and the instruments are unvalidated.

A new `AttemptContext` card leads with the caveats rather than the number, and says plainly that
the comparison is only ever to the user's own attempts. The registry's `limitations` are specific
and were written by reading what each exercise does — a caveat vague enough to apply to anything
teaches users to skip the ones that matter.

The Training page is now grouped **Измерение / Тренировка / Регуляция**, driven by the registry. A
flat strip of twelve tabs said a reaction measurement and a breathing exercise were the same kind
of thing; they are not, and the difference changes how a result should be read.

### The envelope is additive, and that is tested

`TestResult` gained nine optional fields. Nothing migrates or rewrites stored results — deciding
retroactively what device someone used would be fabrication. `record.test.ts` asserts that
year-old `{id, date, type, value}` records still count toward history, are never rewritten, still
aggregate into `buildProfile`, and mix with new records without either being lost.

### A correction to the record

**Phase 2's commit claimed "zero `: any` left in code" and the PR body said "291 → 0". Both were
wrong.** 26 remained. Phase 2 measured with a grep for `: any`, which does not match `useRef<any>`,
`any[]`, or `as any` — three forms that accounted for all of them.

All 26 are now gone, and the count is enforced by `typescript/no-explicit-any` as a lint rule
rather than by a grep. Turning the rule on immediately found four more the corrected grep had
still missed, which is the point.

Removing them surfaced real defects the `any` had been hiding:

- **`newGrid[index].status = 'correct'`** in two exercises mutated the object *inside* a shallow
  array copy — so it mutated React state directly. Replaced with `.map`.
- `ClinicalTests` typed its result as `{score, band}` when the code stored `{score, percent,
  verdict}`; unanswered questions were being summed as `null` and only worked by JS coercion.
- `profile.ts` indexed `chrono[0]` and `chrono[length-1]` unguarded on a screen the user looks at.
- `ProgramImport.normalize()` was not producing a valid `Program` — it omitted the exercise `type`
  that the logging UI branches on.
- `Gym.startWorkout` built exercises whose `type` widened to `string`, so nothing checked it.

**Files changed** — new: `src/features/cognitive/{types,registry,scoring,record,AttemptContext}.tsx?`,
`src/features/cognitive/exercises/` (14 files), two test suites. Deleted:
`src/features/training/tests.tsx`. Modified: `src/types/domain.ts`, `src/pages/Training.tsx`,
`.oxlintrc.json`, and the seven files that held the remaining `any`s.

**Dependencies added** — none.

**Tests added** — 48 (326 total): scoring 35, envelope and backward-compatibility 13.

**Bundle** — Training chunk 37.1 → 39.4 kB; entry unchanged.

**Risks**

- The exercise split was mechanical (a script slicing on top-level `export function`) and is
  verified only by typecheck, lint, build and the a11y sweep. **No exercise was played end to end**
  — they are behind auth, and there is still no authenticated E2E harness. A behavioural regression
  inside one of the twelve would not be caught by anything currently running.
- `plausibleRange` values are my judgement, not measurements. They only affect the 0–100
  normalisation before a user has three attempts of their own, and are documented as a display
  convenience rather than a norm — but they are still invented numbers.

**Known limitations**

- `normalizedScore` is comparable across exercises by construction, but nothing in the UI uses it
  yet. That is Phase 10's job.
- The inline ASRS in `pages/ClinicalTests.tsx` duplicates the `asrs` entry in `lib/clinicalTests.ts`
  with **different scoring** — a percentage against 72 versus a count of items crossing per-item
  thresholds. Two ASRS results in one app that do not agree. Found while typing the file; not
  fixed, because reconciling them changes what users see for a screening instrument and deserves
  its own change.
- `durationMs` is plumbed through `recordAttempt` but only supplied where an exercise already
  tracked elapsed time.

**Next phase** — Phase 10: insights engine and personal baselines.

---
