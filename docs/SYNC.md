# Sync

One JSON snapshot per account in Postgres (`api/state.ts`), with localStorage as the app's working
store. Every device pulls, merges, and pushes conditionally on the version it read.

```
src/lib/cloud.ts          transport — collect, apply, fetch, push
src/lib/merge.ts          the merge policy, pure and unit-tested
src/components/CloudSync.tsx  the orchestration
src/stores/rehydrate.ts   re-reads the stores after a merge
api/state.ts              versioned read/write endpoint
```

---

## The bug this replaces

`CloudSync` used to pull only when the **account** changed:

```ts
const owner = localStorage.getItem(OWNER_KEY);
if (owner === userId) {
    syncingUser.current = userId;
    return;                    // ← never fetched
}
```

A device that had been used before therefore never re-read the cloud. The sequence that loses data
is entirely ordinary:

1. Work on the laptop. The cloud holds the laptop's data.
2. Pick up the phone. It pulls, you add three tasks, it pushes.
3. Reopen the laptop. `OWNER_KEY` still matches, so it skips the pull.
4. Change anything at all. The debounced pusher sends the laptop's **stale whole-blob snapshot**.

The three tasks are gone. So is anything else the phone did. Silently, with no error and no bound
on the loss. The audit called this "last-write-wins"; it was worse — **first-device-wins**.

Two supporting defects: `applySnapshot()` cleared local data *before* writing, so a failure
part-way through left the user with nothing; and `PUT` had no version check, so a correct client
still could not tell it was overwriting newer data.

---

## How it works now

**On sign-in** — always pull. Merge the account's copy into this device's. Apply the merged result,
rehydrate the stores, record the version.

**On a local change** — debounce 2.5s, then `PUT { data, baseVersion }`. The server updates only
`WHERE version = baseVersion`. If the row has moved on it answers **409** *with the current row
attached*, and the client merges against that and retries once.

A different account signing in on the same device still clears first — that data is not this
account's to merge.

**`applySnapshot` writes first**, then removes only the keys the merged snapshot did not carry. The
worst case is now a partially-updated store, which the next merge repairs, rather than an empty one.

**No more `window.location.reload()`.** It existed because state lived in `useState(DB.get(...))`
inside components, unreachable from outside. Since Phase 3 it lives in stores, so
`rehydrateStores()` pushes the merged data straight in — no lost scroll position, no lost form
state, no full-app flash.

---

## Merge policy

Per key, in `src/lib/merge.ts`:

| Policy | Keys | Behaviour |
|---|---|---|
| **append-only** | `diary`, `logs`, `tests`, `clinical`, `cbt`, `snowmanDays` | Union by id. Nothing is ever dropped. |
| **merge-by-id** | `kanban`, `goals`, `habits`, `reminders`, `circles`, `snowmanLabels` | Union by id; on collision the copy claiming to be newer wins, else local. |
| **deep-merge** | `finance`, `gym` | Objects wrapping collections — merge each array, last-write-wins the scalars. |
| **last-write-wins** | `theme`, `dopamineMenu`, `prefs`, `ach`, `onboarding` | Local wins. |

`append-only` is the strictest bucket on purpose: a journal entry, a day log, a completed
assessment and a CBT record are all accounts of something that already happened. Nothing may
remove one behind the user's back.

An **unknown key** falls back to last-write-wins favouring local, so a key added by a newer build
never vanishes because this build's policy table has not heard of it.

### Why not resolve conflicts by timestamp?

**Stored records carry no `updatedAt`.** Every collection has an `id`, several have a `date`, but
nothing records when a record was last *edited*. A same-id conflict genuinely cannot be resolved by
recency, and a design claiming otherwise would be guessing.

That is acceptable, because it is not where the damage was. The failure that loses data is
**deletion by omission** — a stale snapshot dropping records the other device added — and union by
id fixes that completely. Field-level conflicts on a single record are rarer and far less costly.
Records gain `updatedAt` going forward, so this improves over time without rewriting anything
already stored.

---

## Known limitations

**Deletions can come back.** Because the merge is a union, deleting a task on the phone while the
laptop still holds it means the laptop reintroduces it on the next sync. Making deletions stick
needs tombstones — a record of *what was removed and when* — which is a larger change.

Erring toward keeping data is the right trade in the meantime. The behaviour being replaced lost
data outright; this one occasionally keeps too much, which is visible and correctable by the user.

**Three or more devices editing at once** can produce a second 409 after the retry. The client
stops there and waits for the next local change. Nothing is lost — the merge is a union — but the
push is deferred.

**A device that has never successfully pulled does not push.** If the initial pull fails (offline,
endpoint down), the pusher stays disarmed for that session. This is deliberate: a device that has
not reconciled must not be allowed to write. Local data stays fully usable and the next successful
sign-in reconciles.

---

## Verifying a change to this code

`npm test` covers the merge policy (29 cases), the transport (14), and rehydration (6), including
the laptop/phone/laptop sequence above and a mid-apply storage failure.

What tests **cannot** cover here: two real browsers, real Clerk tokens, and a real Postgres row.
Signing in from a test needs either credentials in CI or an auth bypass in the app, and the second
is a security surface deliberately kept out of the repository.

So after changing anything in the sync path, run this by hand:

1. Sign in on browser A. Create three tasks. Wait for the chip to clear.
2. Sign in as the same account on browser B (or a private window). Confirm the three tasks arrive.
3. In B, add a fourth task and tick a habit. Wait for the chip to clear.
4. Return to A. **Reload.** All four tasks and the habit tick must be present.
5. In A, add a fifth task *without* reloading B. In B, add a sixth. Wait for both.
6. Reload both. Both must show tasks 1–6.

Step 4 is the regression this whole phase exists to prevent. Step 5–6 exercises the 409 retry.
