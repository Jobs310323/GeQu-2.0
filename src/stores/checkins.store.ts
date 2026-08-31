import { create } from 'zustand';
import type { DayLog } from '../types/domain';
import { toLocalDateKey, todayKey } from '../lib/datetime';
import { hydrate, persistSlice } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// The daily check-in: the record at the centre of the product loop. Almost
// every other surface reads from it — energy, streaks, gauges, insights.

type CheckinsState = {
    logs: DayLog[];
    add: (log: DayLog) => void;
    remove: (id: number) => void;
    update: (id: number, patch: Partial<DayLog>) => void;
    replaceAll: Setter<DayLog[]>;
};

export const useCheckins = create<CheckinsState>()(set => ({
    logs: hydrate<DayLog[]>('logs', []),
    add: log => set(s => ({ logs: [...s.logs, log] })),
    remove: id => set(s => ({ logs: s.logs.filter(l => l.id !== id) })),
    update: (id, patch) => set(s => ({ logs: s.logs.map(l => (l.id === id ? { ...l, ...patch } : l)) })),
    replaceAll: next => set(s => ({ logs: resolve(next, s.logs) })),
}));

persistSlice(useCheckins, 'logs', s => s.logs);

// --- selectors -------------------------------------------------------------
// Exported as standalone functions so a component subscribes to the one value
// it renders, not to the whole store.

export const selectLogs = (s: CheckinsState) => s.logs;

/** Today's check-in, or undefined before the day is closed. */
export const selectTodayLog = (s: CheckinsState) =>
    s.logs.find(l => toLocalDateKey(l.date) === todayKey());
