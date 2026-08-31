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
