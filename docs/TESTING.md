# Testing

```
npm test              # unit + component (vitest, jsdom)
npm run test:watch
npm run test:coverage

npm run lint          # oxlint + jsx-a11y
npm run typecheck     # tsc, including the test files
npm run build

npm run check:contrast  # design tokens meet WCAG AA in both themes
npm run check:theme     # the app resolves to those tokens, in a browser
npm run check:a11y      # focus, dialogs, viewports, axe, static width scan
npm run smoke           # the built app boots and serves deep links
```

CI (`.github/workflows/ci.yml`) runs all of them on every PR, in three jobs:
`static` (seconds, fails fast), `unit` (across three timezones), and `browser`.

---

## What is tested, and why those things

Coverage is deliberately uneven. The rule is **test what is expensive to get
wrong**, not what is easy to reach.

### `lib/datetime.ts` — 100% statements, enforced by a threshold

This module exists because of a real bug: `new Date().toISOString().split('T')[0]`
appeared at 35 sites and yields the **UTC** date, so every user not on UTC filed
entries under the wrong day for part of every day. Check-ins, habits, streaks and
Snowman records were all affected.

Every case here reproduces a way that bug manifested. The suite is verified to
catch it: reintroducing the UTC shortcut under `TZ=Pacific/Niue` fails two tests.

CI runs the unit suite under **UTC, Pacific/Niue and Pacific/Kiritimati** — a
UTC-only run would pass with the bug reintroduced, because the runner is UTC.
The two Pacific zones sit either side of the date line.

### `lib/clinicalTests.ts` — the highest-stakes code in the app

These are validated psychometric instruments (PHQ-9, GAD-7, PSS-10, WHO-5, ASRS,
ISI, CES-D and others) with published, fixed scoring rules. A bug here does not
produce a wrong pixel — it tells someone their depression is "minimal" when the
same answers score "moderately severe" everywhere else. It is the one output a
user might act on medically.

So the arithmetic is pinned **against the published rules**, not against the
implementation's own behaviour, and four structural invariants are checked across
all twelve instruments:

- reversed and threshold indices address real questions (an off-by-one silently
  changes everyone's score)
- bands cover `0..maxScore` with no gap and no overlap (a gap leaves a score with
  no band; an overlap makes the result depend on array order)
- `maxScore` matches what `scoreTest` can actually produce
- every attainable score resolves to a band

### `features/insights/observe.ts` — the anti-overclaiming rules

The product rule is that below the minimum sample an observation is
**suppressed, not hedged**, and the language states association, never cause.

That is not stylistic. The app shows people conclusions about their own sleep,
focus and mood, and a confident-sounding claim drawn from four days is one they
might act on. The tests assert suppression below `MIN_SAMPLE`, suppression of
effects too small to be worth a sentence, that the reported direction follows the
data rather than the expected story, and that no causal verb appears in the
output.

### `stores/persist.ts` — the layer that protected existing users' data

The Phase 3 refactor deliberately did **not** use zustand's `persist` middleware,
because it wraps values as `{ state, version }` and `lib/cloud.ts` sweeps every
`gequ_*` key raw. Adopting it would have changed the on-disk format for every
existing user and every other device already holding their data.

The tests assert the stored format stays a bare value, that a change in one
domain does not rewrite a neighbouring key (a spurious write is a spurious cloud
upload and a chance to clobber a newer value), and that data written by the
pre-refactor code path rehydrates identically.

### `features/today/Today.tsx` — the product's editorial rules

Not markup. The assertions are the principles from `PRODUCT_PRINCIPLES.md` made
executable: exactly **one** next action and never a list, an honest "not enough
data" instead of a manufactured insight, unknown energy rendering as `—` rather
than a fabricated `0.0`, and the habit card offering the run with the most to
lose then disappearing rather than showing "0 remaining".

---

## Conventions

- **Fixtures state the rule they defend.** A test named `it('works')` tells the
  next reader nothing about whether changing the behaviour is a fix or a
  regression.
- **Freeze the clock** with `vi.useFakeTimers()` for anything date-dependent, and
  restore it in `afterEach`. A suite that passes only before midnight is worse
  than no suite.
- **`localStorage` is cleared before and after every test** (`src/test/setup.ts`).
  Several modules read `gequ_*` keys at import time, so a leaked key surfaces as
  an unrelated failure in another file.
- **Coverage thresholds are per-directory, not global.** A global number lets
  well-tested pure logic mask an untested store.
- **A gate that has never been seen to fail is not known to work.** Both browser
  gates were canary-tested — a deliberate clickable `<div>` and a deliberate
  `w-[400px]` were introduced, confirmed to fail, and reverted. This was not
  paranoia: `npm run lint` reported zero accessibility findings for several
  minutes while its config was silently failing to parse.

---

## The gap: no authenticated E2E

There is **no end-to-end suite**, and the reason is structural rather than
scheduling. Nearly every screen sits behind Clerk auth. Signing in from a test
needs either real credentials in CI or an auth bypass in the app — the second is
a genuine security surface and is deliberately kept out of the repository.

What this means concretely:

- `check:a11y` covers the shared interaction primitives (mounted directly), the
  unauthenticated shell, and a static width scan across all 68 components. It
  does **not** run axe over each authenticated screen.
- `smoke` proves the built app boots and that deep links get the SPA fallback. It
  does not prove any screen works.
- The critical user journey — sign-up → onboarding → check-in → task → habit →
  journal → offline → sync → account deletion — is **not** covered.

Closing this needs a Clerk test-mode user with credentials supplied to CI as
secrets, plus Playwright specs driving the real flows. That is the right next
step for testing, and Phase 8's IndexedDB cutover should not land before it
exists: the data-safety gate for that migration is exactly the kind of thing
unit tests cannot verify on their own.
