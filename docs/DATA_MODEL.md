# Data model and storage

Where the user's data lives, what shape it is in, and how it moves.

```
src/data/repository.ts   the storage boundary — the interface everything above uses
src/data/index.ts        the implementation: dual-write, localStorage-seeded reads
src/data/migrate.ts      localStorage → IndexedDB, with the safety gate
src/stores/persist.ts    the only consumer of the repository
src/lib/db.ts            a thin alias over it, kept for ~30 existing call sites
```

---

## Storage today

**Writes go to both localStorage and IndexedDB. Reads come from localStorage.**

That is deliberate, and the reasoning matters more than the arrangement:

- **Reads stay synchronous** because every consumer is a zustand store initialised at module load.
  Making them async pushes a loading state into the shell before first paint. That work is real and
  nothing the user would notice today justifies it — the whole dataset is a few hundred KB.
- **Writes go to IndexedDB anyway** so the data is safely there, verified, with the migration
  proven. Switching which store seeds reads then becomes a one-line change rather than a project.

So the migration is done and the risk is retired; the *cutover* waits for a reason to happen —
a larger dataset, storage-pressure eviction, or an offline requirement localStorage cannot meet.

**localStorage is never deleted.** It is the rollback path, and `rollbackToLocalStorage()` is a
single flag removal precisely because the original data was never touched.

### Keys

All prefixed `gequ_`. Two device-only keys never leave the browser: `gequ_groq_key` (an API
credential, not user data) and `gequ_cloud_owner` (which account this browser last held).

| Key | Shape | Sync policy |
|---|---|---|
| `kanban`, `goals` | `{id}[]` | merge-by-id |
| `habits`, `reminders`, `circles`, `snowmanLabels` | `{id}[]` | merge-by-id |
| `logs`, `diary`, `tests`, `clinical`, `cbt`, `snowmanDays` | `{id, date}[]` | **append-only** |
| `finance`, `gym` | object wrapping `{id}[]` | deep-merge |
| `theme`, `dopamineMenu`, `prefs`, `ach` | scalar / small object | last-write-wins |

Sync policy is defined in `src/lib/merge.ts` and explained in `docs/SYNC.md`.

---

## Sensitivity

Classified here so Phase 12 has something to act on rather than starting from scratch.

| Class | Keys | Why |
|---|---|---|
| **Highly sensitive** | `diary`, `logs`, `clinical`, `cbt`, `tests`, `finance` | Journal entries, mood and sleep records, mental-health screening results, CBT thought records and complete financial history. Disclosure is materially harmful. |
| **Sensitive** | `habits`, `gym`, `snowmanDays` | Health and routine data. Revealing, not catastrophic. |
| **Private** | `kanban`, `goals`, `reminders`, `circles` | Ordinary personal planning. |
| **Preference** | `theme`, `prefs`, `dopamineMenu`, `ach` | No disclosure risk. |

Everything above Preference is stored **unencrypted** in the browser and travels to the server as
one JSON blob. Server-side authorisation (Clerk token → `user_id` row) is the only boundary that
counts today. The Finance PIN is a UI curtain, not a lock — plaintext, compared with `===`, and
swept into the cloud snapshot with everything else. Phase 12 either makes it a real device-local
gate or drops the claim.

---

## Record shapes

Every collection record carries an `id`. Records that describe a moment carry a `date` holding an
ISO-8601 **instant**; calendar days are derived at read time with `toLocalDateKey` (see
`src/lib/datetime.ts` — deriving rather than storing is what let the timezone fix apply to existing
data without rewriting any of it).

**Records do not yet carry `updatedAt`.** This is the one real gap in the model. Without it a
same-`id` conflict between two devices cannot be resolved by recency, so the merge unions and
prefers local. Adding it is additive and does not require rewriting stored data — new writes carry
it, old records simply do not, and `mergeById` already handles a mixed pair by falling back to
local.

---

## Schema versioning

`DATA_SCHEMA_VERSION` in `src/data/repository.ts` is the IndexedDB version and the value written to
the migration flag. It is `1`.

A future format change bumps it, which reopens the database with an `onupgradeneeded` and lets a
migration know what it is reading. The migration flag being version-stamped means an old flag no
longer counts as migrated, so the new migration runs.

---

## The migration, and why it is built the way it is

`migrateToIdb()` is the one operation that can destroy data existing nowhere else. It is
deliberately boring:

1. **It never deletes from localStorage.** Disk is not the constraint; a user losing five years of
   journal entries is.
2. **It is idempotent.** Twice, in two tabs, or after an interrupted run — same result.
3. **It verifies before it commits.** Each key is read back out of IndexedDB and compared before it
   counts. The flag is written only after every key round-trips.
4. **A partial failure leaves the flag unset**, so the next startup retries and the app keeps
   reading localStorage in the meantime. The user notices nothing.

`src/data/migrate.test.ts` is the brief's nine-point safety gate as executable tests — old data,
new data, partial failure, duplicate and concurrent runs, interruption, offline, backup, rollback,
and "nothing is deleted before verification". Verified by canary: making the migration tidy up
localStorage after copying fails eight of them.

---

## Offline

The shell is precached (including the two Inter subsets, so text does not reflow into a fallback
face). Data needs no network at all — it is local by construction.

`/api/state` is explicitly **NetworkOnly**. A cached snapshot served to the merge would look like
the server's current state and could push a stale version back over newer data, which is precisely
the failure `docs/SYNC.md` describes. Sync failing cleanly while offline is correct; sync
succeeding with stale data is not.

---

## Known gaps

- **Reads have not moved to IndexedDB.** Dual-write means they can, whenever there is a reason.
- **No `updatedAt` on records**, so conflict resolution is union-and-prefer-local.
- **No record envelopes or schema validation.** `repository.get<T>` returns the caller's assertion
  about what is stored, not a guarantee. Honest for data the app wrote itself; it becomes a real
  gap the moment import from an external source exists.
- **No encryption at rest.** Highly-sensitive data sits in plaintext in the browser and in one
  JSONB column. Phase 12.
- **Deletions are not tombstoned**, so a delete on one device can be undone by another. See
  `docs/SYNC.md`.
