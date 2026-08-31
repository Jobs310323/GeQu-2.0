# GeQu — Architecture Audit

**Date:** 2026-08-28
**Scope:** full repository at `claude/gequ-2-product-transformation-n5f3eu`
**Baseline:** ~12,900 LOC across `src/` and `api/`, React 19 + TypeScript + Vite 8 + Tailwind 3 + Clerk + Neon Postgres + vite-plugin-pwa.

This document is the factual starting point for the GeQu 2.0 transformation. It records what the
code actually does today, not what it was intended to do. Every claim below was verified against
the source; file and line references are exact at the time of writing.

---

## 1. Current architecture

### Composition

```
main.tsx
├─ /concept-v2/*  → ConceptV2App          (unauthenticated design preview, parallel app)
├─ no Clerk key   → static "not configured" screen
└─ ClerkProvider
   └─ App.tsx
      ├─ <SignedOut>  → AuthGate           (Clerk SignIn/SignUp, framed)
      └─ <SignedIn>   → CloudSync + GequApp
                        ├─ Sidebar         (nav, theme, energy, level, settings)
                        └─ <main> {page === 'dashboard' ? <Dashboard/> : PAGES[page]}
```

### State

All application state lives in a single component, `GequApp` (`src/App.tsx:33-184`): 18
`useState` hooks holding logs, diary, goals, habits, kanban, test results, achievements, theme,
gym data, circles, reminders, clinical results, CBT records, finance, snowman labels, snowman
days, prefs and a Pomodoro timer. Each is initialised straight from `localStorage` via
`DB.get(...)` and mirrored back by its own `useEffect` (`src/App.tsx:83-107`, 18 effects).

Every page receives its slice by prop drilling through the `PAGES` lookup
(`src/App.tsx:128-151`). `UserCard` alone takes 11 props; `Dashboard` takes 13.

### Navigation

`const [page, setPage] = useState('dashboard')` (`src/App.tsx:34`). `PAGES` is a
`Record<string, ReactElement>` built eagerly on every render — all 19 page components are
constructed on every state change regardless of which one is visible. `setPage` is threaded into
`Sidebar`, `Dashboard` and `Knowledge` as a prop. `src/lib/nav.ts` supplies the nav *data*
(6 groups + 3 standalone entries) and is the single source of truth for nav structure.

### Persistence

`src/lib/db.ts` — a 34-line `localStorage` wrapper with a `gequ_` prefix, a change-listener set,
and swallow-everything error handling. Values are untyped (`get(key, def: any): any`).

### Cloud sync

`src/lib/cloud.ts` + `src/components/CloudSync.tsx` + `api/state.ts`. The whole of
`localStorage` (minus two device-only keys) is collected into one `Record<string, string>`
snapshot and `PUT` to a single `user_state` row keyed by Clerk user id, as `jsonb`. Pull happens
once per sign-in when the device's recorded owner differs from the current user.

### Backend

One serverless function, `api/state.ts` (69 lines): `GET`/`PUT` on `user_state`, Clerk token
verified with `verifyToken`, schema created lazily on cold start. Deployed to Vercel with an
SPA rewrite (`vercel.json`).

### Design layer

Two coexisting systems:
- **Production:** `src/index.css` — CSS custom properties (`--bg-main`, `--accent-cyan`, …),
  a `.glass-card` utility, and a block of `:root.light .text-white`-style overrides that remap
  ~260 dark-first Tailwind utilities for the light theme. `tailwind.config.js` redefines
  Tailwind's stock hues (cyan/purple/pink/green/red/yellow) to desaturated values so ~500
  existing call sites inherit the restrained palette without being edited.
- **Preview:** `src/concept-v2/` — a second app with its own `Sidebar`, `BentoCard`, `Icons`,
  `RadialGauge`, `TagPill`, `nav.ts` and `mockData.ts`, served at `/concept-v2`.

### Feature modules

`src/features/` holds `gym` (929 LOC), `training` (1100 LOC of cognitive exercises), `snowman`
(a balance/gamification tracker, the only feature with logic properly separated from UI),
`dopamine`, `hyperfocus` and `charts`. `src/pages/` holds 19 page components. `src/lib/` holds
15 shared modules, of which `profile.ts`, `xp.ts`, `clinicalTests.ts`, `taskTree.ts`,
`mindTree.ts` and `snowman/logic.ts` are pure and reusable.

---

## 2. Main technical debt

| # | Issue | Evidence | Impact |
|---|---|---|---|
| T1 | **No router.** Navigation is component state. | `src/App.tsx:34` | No URLs, no back/forward, no deep links, no refresh-safety, no shareable state, no route-level code splitting. |
| T2 | **No code splitting.** No `lazy`, no `Suspense` anywhere. | 0 matches repo-wide | All 19 pages, Chart.js, `@xyflow/react` and `marked` land in the initial bundle. |
| T3 | **No error boundary.** | 0 matches repo-wide | One throw in any feature blanks the entire app. |
| T4 | **TypeScript strict is off.** `tsconfig.app.json` has no `strict` key at all. | `tsconfig.app.json` | 291 `: any` annotations; virtually every component's props are `({ ... }: any)`. Refactors are unguarded. |
| T5 | **God component.** 18 `useState` + 18 persistence effects in one component. | `src/App.tsx:33-107` | Any state change re-renders and re-constructs all 19 page elements. |
| T6 | **Prop drilling.** | `src/App.tsx:128-158` | `UserCard` 11 props, `Dashboard` 13. Adding a field touches App plus every intermediate. |
| T7 | **Lint config is not loaded.** File is named `_oxlintrc.json`; oxlint looks for `.oxlintrc.json`. | repo root | `npm run lint` has never applied the project's own rules, including `react/rules-of-hooks`. |
| T8 | **Dead code and deps.** `src/App.css` (never imported, references `--accent`, `--social-bg`, `--text-h`, `--shadow` — none of which exist); `src/assets/{hero.png,react.svg,vite.svg}`; `dagre` + `@types/dagre` (0 usages); `README.md` is the unmodified Vite template. | | Misleads readers; ships weight. |
| T9 | **No test infrastructure.** No test runner, no test files, no CI. | | Every change is verified by hand. |
| T10 | **`document.documentElement.className = theme`** replaces the whole class list. | `src/App.tsx:106` | Any other class on `<html>` is silently destroyed. |
| T11 | **Duplicated design layer.** `concept-v2` re-implements 5 components. | `src/concept-v2/components/` | Two sources of truth; fixes must be made twice or diverge. |
| T12 | **Oversized modules.** `training/tests.tsx` 1100 LOC (12 exercises in one file), `Gym.tsx` 929, `Finance.tsx` 680, `Dashboard.tsx` 465. | | Business logic and UI inseparable; nothing unit-testable. |

---

## 3. UX debt

- **No "now" surface.** The default page (`dashboard`) is a *day-closing form* — eleven
  collapsible sections asking about sleep, focus, mood, tags, main event, gratitude and a custom
  question. It answers "what happened today", not "what should I do next". The product's first
  screen is retrospective when the core loop needs it to be prospective.
- **Flat, competing IA.** 19 destinations sit at one cognitive level across 6 nav groups
  (`src/lib/nav.ts`). Kanban, Goals, MindMap, Diary, Habits, Snowman, Calendar, Gym, Finance,
  Circles, Clinical tests, Trainers, Progress, Hub, Knowledge are peers. The user must hold the
  app's structure in their head.
- **Discoverability is entry-point dependent.** Two real pages are unreachable from the nav
  list: `dashboard` is behind a "Новая запись" button, `card` behind the level/energy block
  (documented in `src/lib/nav.ts:1-8`). The user cannot find them by scanning.
- **No quick capture.** Every creation path requires navigating to the right page first. There
  is no global add, no command palette, no keyboard entry point.
- **No onboarding.** A new account lands on an empty eleven-section form with no explanation.
- **Empty / loading / error states are ad hoc.** No shared pattern; several pages render nothing
  at all when their collection is empty.
- **No undo.** Deletions across tasks, journal entries, transactions and results are immediate
  and unrecoverable.
- **Gamification is decoupled from the loop.** XP, levels, achievements and the Snowman reward
  activity but are not connected to the reflect/adapt half of the cycle.

---

## 4. Information-architecture problems

The current grouping is by *feature type* (Каждый день / Дела / Финансы / Тело и мозг / Анализ /
Справка). The user's actual question is temporal and intentional: *what now, what next, how am I
doing*. Feature-type grouping forces the user to translate their intent into the app's taxonomy
on every interaction.

Specific defects:
- `aiplan`, `calendar`, `habits`, `snowman` in one group have nothing in common but frequency.
- `circles` (a CBT/Stoic exercise) and `clinical` (screening questionnaires) sit under "Тело и
  мозг" next to `gym` (physical training) and `training` (cognitive drills) — four unrelated
  concerns.
- `progress` and `hub` are two separate statistics destinations with overlapping content.
- `diary` (journal) is filed under "Дела" (tasks).
- There is no home for *insight* — the output of the whole system — beyond raw statistics.

**Target:** Today · Plan · Track · Insights · Brain · Profile, with today's 19 destinations
demoted to sub-routes inside those six.

---

## 5. Security and privacy risks

| # | Risk | Detail | Severity |
|---|---|---|---|
| S1 | **Finance PIN is a curtain, not a lock.** Stored as plaintext in `FinanceData.pin`, compared with `value === pin` (`src/pages/Finance.tsx:119`), and — because `collectSnapshot()` sweeps all `gequ_*` keys — **uploaded to the server inside the state blob**. | The UI presents it as protection for the most sensitive numeric data in the app. | High |
| S2 | **Highly sensitive data has no classification or special handling.** Journal text, ADHD screening scores, PHQ-9 depression scores, body-scan notes, gratitude entries and full financial history are stored and synced identically to the theme preference. | | High |
| S3 | **No account deletion, no export.** There is no way for a user to remove their data from `user_state`, and no export path. | GDPR/consumer expectation gap. | High |
| S4 | **Groq API key in `localStorage`** (`src/lib/ai.ts:11`), used for direct browser→Groq calls. Correctly excluded from sync (`cloud.ts:14`) and honestly documented in the file header — but it remains readable by any script on the origin. | Acceptable for single-user, unacceptable for a product. | Medium |
| S5 | **Profile payload sent to a third-party LLM.** `buildProfile()` (`src/lib/profile.ts`) assembles journal excerpts, CBT thought records, clinical scores and finance aggregates; `lib/ai.ts` posts that to Groq. Finance is aggregated and the PIN excluded (a deliberate, documented choice), but journal and CBT text go out verbatim. | No consent gate. | High |
| S6 | **No server-side authorization beyond identity.** `api/state.ts` verifies the token and trusts everything else. Adequate today (one row per user, no sharing) but there is no rate limit, no payload size bound, and no audit trail. | | Medium |
| S7 | **No error monitoring**, so no visibility into production failures — and, correspondingly, no scrubbing policy in place before one is added. | | Medium |

---

## 6. Performance risks

- **Initial bundle carries everything** (T2): Chart.js, `@xyflow/react`, `marked`, all 19 pages.
- **`PAGES` object is rebuilt every render** (`src/App.tsx:128`), constructing 19 React elements
  per keystroke anywhere in the tree.
- **No memoisation anywhere.** Energy (`App.tsx:110-123`) and XP/level
  (`App.tsx:125`, walking every log, habit, task, workout and test result) are recomputed on
  every render of the root component.
- **18 synchronous `JSON.stringify` + `localStorage.setItem` effects** fire on their respective
  state changes; `goals` alone is debounced (`App.tsx:90-94`).
- **No list virtualisation.** Journal, finance entries, test results and knowledge articles all
  render in full.
- **`collectSnapshot()` serialises the entire dataset** on every debounced push (2.5s).
- **No performance budget** and no bundle analysis in the build.

---

## 7. Accessibility risks

Measured, not estimated:

- **3 `aria-*` attributes and 1 `role=` in the entire codebase.**
- **15 clickable `<div>` elements** — not focusable, not keyboard-operable, not announced.
- **No focus management.** Modals (`DopamineRoulette`, `HyperfocusOverlay`, finance dialogs,
  `LockScreen`) neither trap focus nor restore it, and Escape is not handled.
- **No visible focus styling** beyond browser defaults, which the custom button styling
  frequently obscures.
- **No `prefers-reduced-motion` handling.** Seven keyframe animations run unconditionally
  (`popIn`, `fadeInUp`, `breathGlow`, `confettiFall`, `snowGrow`, `pulseOutline`, plus transitions).
  `breathGlow` and `pulseOutline` loop infinitely.
- **Heading structure is decorative**, not hierarchical; no landmarks (`<nav>` exists in
  `Sidebar`; no `<header>`, no `<h1>` per view in most pages).
- **Colour is load-bearing without a text alternative** — energy state (green/yellow/red),
  clinical result bands (`tone: 'good' | 'mild' | 'moderate' | 'high'`), finance categories.
- **Contrast is unverified.** The deliberately desaturated palette (`tailwind.config.js`) puts
  several combinations near threshold: `--text-muted #868C99` on `--bg-main #0A0B0D` is fine,
  but `text-gray-600` on `--bg-card` and the `.light` accent remaps have not been measured.
- **Form inputs are largely unlabelled**, relying on `placeholder` alone.
- **Cognitive exercises are timed and colour-based** (Stroop especially) with no alternative
  input modality and no way to extend time.

---

## 8. PWA and offline risks

- `vite-plugin-pwa` runs with **default `generateSW`** and `registerType: 'autoUpdate'`. Build
  assets are precached; **nothing else is**. There is no runtime caching strategy, no navigation
  fallback configuration, and no offline handling for `/api/state`.
- **No offline write path.** Writes go to `localStorage` (which works offline) but sync failures
  are swallowed: `pushRemote(...).catch(() => {})` (`CloudSync.tsx:68`) with the comment
  "retried on next change" — meaning if no further change occurs, the data is never pushed.
- **No sync status is ever shown.** The user cannot tell whether their data reached the server.
- **Sign-in forces a full page reload** (`CloudSync.tsx:52`) to re-seed `useState(DB.get(...))`
  after a pull. Any in-flight unsaved work is lost.
- **Manifest is Russian-only** and the description hardcodes "Когнитивный трекер для СДВГ"
  (`vite.config.ts`), which contradicts the intended international positioning.
- `index.html` declares `lang="en"` for an entirely Russian interface.

---

## 9. Data-model risks

| # | Risk | Detail |
|---|---|---|
| D1 | **Timezone correctness — active data corruption.** `new Date().toISOString().split('T')[0]` appears **35 times** (`App.tsx:110`, `features/snowman/logic.ts:5`, `Gym.tsx:63`, and 32 more). `toISOString()` is **UTC**. For a user at UTC+3, everything before 03:00 local is filed under the previous day; for UTC−5, everything after 19:00 local is filed under the next day. This silently breaks daily check-ins, streaks (`lib/helpers.ts`, `lib/profile.ts:45-56`), habit completion, Snowman day records and calendar alignment. | Critical |
| D2 | **No record envelope.** Entities have ad-hoc shapes: some use `id: number` from `Date.now()` (collision-prone within a millisecond), some `id: string`; only `snowman` records carry `createdAt`/`updatedAt`. There is no `version` and no `deleted_at`, so deletion is destructive and unmergeable. | High |
| D3 | **No schema version.** Nothing records which shape the stored data is in, so no migration is possible without guessing. | High |
| D4 | **Blind last-write-wins across the whole dataset.** Two devices editing different features still overwrite each other completely, because the unit of sync is the entire snapshot. | High |
| D5 | **Money as floating-point.** `amount: number` in currency units throughout `Finance.tsx`; sums accumulate error. | Medium |
| D6 | **`localStorage` is a hard ceiling.** ~5 MB, synchronous, string-only. Journal + finance + workout history + cognitive results will reach it. | Medium |
| D7 | **Untyped reads.** `DB.get(key, def: any): any` erases all type information at the persistence boundary. | Medium |

---

## 10. Recommended migration order

Ordered so that each step makes the next one safe, and so the highest-severity defects are fixed
early rather than at the end.

| Phase | Work | Why here |
|---|---|---|
| 0 | This audit + product principles | Shared factual basis |
| 1 | Real routing, error boundaries, **timezone fix**, housekeeping | Routing is the precondition for code splitting, deep links and the new IA. The timezone fix is pulled forward from "data" because it is actively corrupting records every day it ships. |
| 2 | TypeScript strict | Must precede the state refactor, or the refactor is unguarded |
| 3 | Domain stores | Must precede the IA rework, or state stays welded to the old page tree |
| 4 | Today, Quick Capture, IA, onboarding | The product change the rest exists to serve |
| 5 | Design system consolidation | After the component tree settles, before the a11y pass |
| 6 | Accessibility + responsive | Needs stable tokens (contrast, focus, motion) to be worth doing once |
| 7 | Testing + CI | Before touching persistence — the data work needs a safety net |
| 8 | Offline-first, IndexedDB, sync engine | Highest-risk change; goes last among the foundations, behind tests |
| 9 | Cognitive engine unification | Independent of the above; benefits from strict types and tests |
| 10 | Insights engine | Depends on stores (3), data integrity (1, 8) and cognitive metadata (9) |
| 11 | Internationalization | Mechanical; wants a settled component tree so strings are extracted once |
| 12 | Privacy and security | Needs the data model (8) to implement real deletion and export |
| 13 | Analytics and observability | Last: instrument a product whose loop has stopped moving |

Monetization is deliberately excluded until activation and retention are measurable.

---

## 11. Architecture decisions

Recorded as ADRs in `docs/adr/`:

- **ADR-001 — Routing: React Router v7.** Mature, no codegen step, and the existing Vercel SPA
  rewrite already supports it. TanStack Router's typed routes do not pay for their build
  complexity at this size.
- **ADR-002 — State: Zustand, one store per domain, with selectors.** ~1 KB, no provider,
  and — decisively — incremental: domains can be lifted out of `GequApp` one at a time while the
  rest keeps working.
- **ADR-003 — Persistence: repository interface now, IndexedDB later.** A `Repository`
  abstraction over the existing `gequ_*` keys, plus record envelopes and `dataSchemaVersion`,
  lets the storage engine change later without touching features.
- **ADR-004 — Sync: keep the JSONB endpoint, add optimistic concurrency.** The defect is the
  missing conflict strategy, not the row shape. Per-entity `updatedAt`/`version`/`deviceId`, a
  mutation queue, and a `baseUpdatedAt` precondition fix it without a table explosion.
- **ADR-005 — Design system: one token layer.** `src/styles/tokens.css`, with `--accent-*`
  retained as aliases so no call site breaks during migration; `concept-v2` merged in, then
  deleted.

---

## 12. Risks of each proposed change

| Change | Risk | Mitigation |
|---|---|---|
| Introduce a router | Bookmarks and the PWA start URL change; a mistyped route becomes a blank screen | Keep `/` as Today; add a 404 route and route-level error boundaries in the same commit |
| **Timezone fix** | Records written under the old UTC-derived key may shift day when re-read | Change only the *derivation* of "today", never rewrite stored values; keep stored dates as full ISO instants and derive local keys at read time; verify with `TZ=Pacific/Kiritimati` and `TZ=Pacific/Niue` |
| TypeScript strict | Large mechanical diff; temptation to silence errors with `any` | Two sub-steps; fix root causes; every surviving cast carries a justification comment |
| State refactor | Behavioural regressions where a `useEffect` ordering was load-bearing | One domain per commit; persistence moved into store middleware, not reimplemented |
| New IA | Users lose familiar paths | Old page ids map to new routes with redirects; nothing is removed, only re-parented |
| Design token migration | Visual drift across ~500 Tailwind call sites | Legacy tokens remain as aliases until the last consumer moves; remove only after verification |
| Delete `concept-v2` | Loss of the design reference | Merge its components into `src/components/` and verify before deleting |
| **IndexedDB cutover** | Data loss — the highest-risk change in the programme | Dual-write; explicit backup; migration + rollback; tests for old data, new data, partial failure, duplicate requests, refresh mid-migration, offline mid-migration |
| Sync conflict strategy | A wrong merge silently loses an edit | Per-domain policy, append-only for journal/finance/assessments, user-resolved for same-field conflicts; never blind-overwrite |
| Replace the Finance PIN | Users lose a feature they trusted | Be explicit that it was never a lock; either remove the claim or implement a real device-local gate — do not quietly keep the curtain |
| i18n extraction | Missed strings ship as raw keys | English as the source locale so a missing key is still readable; CI check for untranslated literals |
| Analytics | Sensitive content leaking into event payloads | Fixed event taxonomy, no free-text fields, allowlist enforced in the client wrapper |
