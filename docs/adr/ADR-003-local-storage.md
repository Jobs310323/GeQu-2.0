# ADR-003 — Local persistence: repository interface now, IndexedDB later

**Status:** Accepted · 2026-08-28

## Context

`src/lib/db.ts` is a 34-line `localStorage` wrapper: `get(key, def: any): any`, `save(key, data)`,
a change-listener set, and swallow-everything error handling. Every feature calls it directly.

Problems: `localStorage` is synchronous, string-only and capped around 5 MB; reads are untyped, so
all type information is lost at the persistence boundary; records have no common envelope (some
ids are `Date.now()` numbers, only `snowman` records carry timestamps); there is no schema version,
so no migration is possible; and deletion is destructive, which makes merge-based sync impossible.

## Decision

Introduce **`src/data/`** — a repository layer — *before* changing the storage engine.

1. **`Repository<T>` interface**: `list`, `get`, `put`, `remove`, `bulkPut`, `subscribe`. Async by
   signature from day one, so the engine can change without touching callers.
2. **Record envelope** on every structured record:
   `{ id: string; createdAt: string; updatedAt: string; version: number; deletedAt: string | null }`.
   Deletion becomes a tombstone, which is what makes sync mergeable (ADR-004).
3. **`dataSchemaVersion`** plus an ordered migration pipeline (`v1 → v2 → …`), each migration pure
   and independently tested.
4. **Initial engine: the existing `gequ_*` `localStorage` keys**, behind the interface. No data
   moves in this step.
5. **Later (Phase 8): IndexedDB via `idb`**, swapped in behind the same interface — dual-write
   first, verify, then cut over. `localStorage` retains only theme, small UI preferences and
   onboarding flags.

## Consequences

**Positive.** Features stop knowing where data lives; reads become typed; records become
versioned and mergeable; migrations become possible and testable; the storage-engine change
becomes a contained, reversible step instead of an app-wide rewrite.

**Negative.** An async boundary where there was a synchronous one — components that did
`useState(DB.get(...))` need a load state. This is a real cost, and also a correctness improvement:
the current synchronous read is why sign-in has to call `window.location.reload()`.

**Risk.** The IndexedDB cutover is the highest-risk change in the programme. It is gated on
Phase 7's tests and on an explicit checklist: backup, migration, rollback, and tests for old data,
new data, partial failure, duplicate requests, refresh mid-migration, and offline mid-migration.

## Alternatives considered

**Move straight to IndexedDB.** Rejected: changes the storage engine and the call-site contract in
one step, with no test net (Phase 7 has not run yet) and no rollback.

**Keep `localStorage` permanently.** Rejected: the 5 MB ceiling is reachable with journal, finance
and workout history, and synchronous writes on the main thread get worse as data grows.

**A full SQL schema on the server as the primary store.** Rejected: makes the app online-only,
which contradicts the offline-first commitment.
