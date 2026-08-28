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
