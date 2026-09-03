import { describe, it, expect, beforeEach } from 'vitest';
import { rehydrateStores, REHYDRATED_KEYS } from './rehydrate';
import { DB } from '../lib/db';
import { useTasks } from './tasks.store';
import { useCheckins } from './checkins.store';
import { useHabits } from './habits.store';
import { useCognitive } from './cognitive.store';
import { useAppUi } from './app-ui.store';

/**
 * `rehydrateStores` replaces the `window.location.reload()` that cloud sync
 * used to fire after pulling. The reload was blunt but self-maintaining: it
 * re-read *everything* by definition. Naming each slice by hand is better for
 * the user and worse for the code, because a slice added to a store and
 * forgotten here would silently stop refreshing after a sync — and the symptom
 * would be "my phone's tasks didn't show up", weeks later, with no error.
 *
 * The first test is the guard against exactly that.
 */

/** Every store module's source, read at build time by Vite. */
const STORE_SOURCES = import.meta.glob('./*.store.ts', {
    query: '?raw', import: 'default', eager: true,
}) as Record<string, string>;

/** The `gequ_*` slice names the stores actually persist. */
function persistedKeys(): Set<string> {
    const keys = new Set<string>();
    for (const src of Object.values(STORE_SOURCES)) {
        // persistSlice(useX, 'key', …)
        for (const m of src.matchAll(/persistSlice\(\s*use\w+\s*,\s*'([^']+)'/g)) keys.add(m[1]!);
        // persistSlices(useX, { key: s => …, key2: s => … })
        for (const b of src.matchAll(/persistSlices\(\s*use\w+\s*,\s*\{([\s\S]*?)\}\s*\)/g)) {
            for (const k of b[1]!.matchAll(/(\w+)\s*:\s*s\s*=>/g)) keys.add(k[1]!);
        }
    }
    return keys;
}

beforeEach(() => {
    localStorage.clear();
    useTasks.setState({ kanban: [], goals: [] });
    useCheckins.setState({ logs: [] });
    useHabits.setState({ habits: [] });
});

describe('coverage of the stores', () => {
    it('re-reads every key the stores persist', () => {
        // Scraped straight from the store modules, so this cannot drift: add a
        // slice without adding it here and the suite fails, naming the key.
        const persisted = persistedKeys();
        expect(persisted.size).toBeGreaterThan(10);

        const missing = [...persisted].filter(k => !REHYDRATED_KEYS.includes(k as never));
        expect(missing, `not re-read after sync: ${missing.join(', ')}`).toEqual([]);
    });

    it('lists no key that nothing persists', () => {
        // The other direction: a stale entry here implies coverage it does not
        // have. `prefs` is expected — it has its own writer in app-ui.store.
        const persisted = persistedKeys();
        persisted.add('prefs');
        const stale = REHYDRATED_KEYS.filter(k => !persisted.has(k));
        expect(stale, `listed but never persisted: ${stale.join(', ')}`).toEqual([]);
    });
});

describe('rehydrating', () => {
    it('picks up data written underneath a live store', () => {
        // Exactly what sync does: write the merged snapshot to localStorage,
        // then tell the stores to look again.
        expect(useTasks.getState().kanban).toHaveLength(0);

        DB.save('kanban', [{ id: 1, text: 'из облака', status: 'todo', priority: 'low' }]);
        rehydrateStores();

        expect(useTasks.getState().kanban).toHaveLength(1);
        expect(useTasks.getState().kanban[0]).toMatchObject({ text: 'из облака' });
    });

    it('refreshes several stores in one pass', () => {
        DB.save('logs', [{ id: 1, date: '2026-08-01T00:00:00Z', sleep: 7, focus: 6, mood: 6 }]);
        DB.save('habits', [{ id: 2, name: 'вода', history: [] }]);
        DB.save('tests', [{ id: 3, date: '2026-08-01T00:00:00Z', type: 'schulte', value: 40 }]);

        rehydrateStores();

        expect(useCheckins.getState().logs).toHaveLength(1);
        expect(useHabits.getState().habits).toHaveLength(1);
        expect(useCognitive.getState().results).toHaveLength(1);
    });

    it('falls back to empty rather than undefined when a key is absent', () => {
        // A merged snapshot need not contain every key. Setting a store slice
        // to undefined would break every component reading it.
        rehydrateStores();
        expect(useTasks.getState().kanban).toEqual([]);
        expect(useCognitive.getState().results).toEqual([]);
        expect(useAppUi.getState().theme).toBeDefined();
    });

    it('is idempotent', () => {
        DB.save('kanban', [{ id: 1, text: 'задача', status: 'todo', priority: 'low' }]);
        rehydrateStores();
        rehydrateStores();
        expect(useTasks.getState().kanban).toHaveLength(1);
    });
});
