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
