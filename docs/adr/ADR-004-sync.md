# ADR-004 — Sync: keep the JSONB snapshot, add optimistic concurrency

**Status:** Accepted · 2026-08-28

## Context

`src/lib/cloud.ts` sweeps every `gequ_*` key into one `Record<string, string>` snapshot and `PUT`s
it to a single `user_state` row (`api/state.ts`) as `jsonb`. `CloudSync.tsx` pulls once per
sign-in when the device's recorded owner differs, then calls `window.location.reload()` to re-seed
component state.

Failure modes in the current design:

- **Blind last-write-wins over the entire dataset.** Two devices editing different features still
  overwrite each other, because the unit of sync is everything.
- **Silent push failure.** `pushRemote(...).catch(() => {})` (`CloudSync.tsx:68`), commented
  "retried on next change" — if no further change occurs, the write is simply lost.
- **No sync status** is ever shown to the user.
- **A full reload on sign-in** discards in-flight work.

## Decision

Keep the single-row JSONB endpoint. **The defect is the missing conflict strategy, not the row
shape** — the payload is a few hundred KB and splitting it into six tables would not fix any of
the failure modes above.

Add:

1. **Per-entity metadata** from ADR-003: `updatedAt`, `version`, `deviceId`, `deletedAt`.
2. **A mutation queue** persisted locally: every write is enqueued, then drained when online.
   Failures retry with backoff instead of vanishing.
3. **Optimistic concurrency on the server.** `PUT /api/state` carries `baseUpdatedAt`; the handler
   rejects with `409` if the stored `updated_at` has moved. The client then merges and retries.
4. **Per-domain conflict policy**, stated explicitly rather than implied:
   | Domain | Policy |
   |---|---|
   | UI preferences, theme | last-write-wins |
   | Tasks, habits, goals | merge by id, field-level last-write-wins on `updatedAt` |
   | Journal, finance entries, assessment results | append-only; tombstones never resurrect |
   | Same-field edit to the same record on two devices | surface to the user |
5. **A visible sync state**: `synced · syncing · offline · error · conflict`, shown unobtrusively.
6. **Remove the reload.** With stores (ADR-002) reading through the repository (ADR-003), a pull
   updates state in place.

## Consequences

**Positive.** Concurrent edits on two devices stop destroying each other; failed pushes retry
instead of disappearing; the user can see whether their data is safe; sign-in stops losing
in-flight work.

**Negative.** More client complexity: a queue, a merge step, and a conflict UI that must be built
even though it will rarely be seen. Tombstones mean deleted records occupy space until compacted.

**Neutral.** The server change is additive — an optional `baseUpdatedAt` precondition. Older
clients that omit it keep working (with the old semantics) during rollout.

## Alternatives considered

**Normalise into six Postgres tables.** Rejected for now: real work, and it fixes none of the four
failure modes, all of which are conflict-resolution problems. Revisit if the payload grows past a
few MB or if server-side querying becomes necessary.

**CRDTs (Yjs / Automerge).** Correct by construction for concurrent edits, and genuinely tempting
for the journal. Rejected as disproportionate: a substantial dependency and a new mental model for
a single-user app whose realistic concurrency is "phone and laptop, rarely at the same instant".
The per-domain policy above covers that case at a fraction of the cost.

**Server-authoritative, online-only.** Rejected: contradicts the offline-first commitment.
