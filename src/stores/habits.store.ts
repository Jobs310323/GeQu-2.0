import { create } from 'zustand';
import type { Habit } from '../types/domain';
import { todayKey } from '../lib/datetime';
import { hydrate, persistSlice } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

type HabitsState = {
    habits: Habit[];
    setHabits: Setter<Habit[]>;
    add: (name: string) => void;
    remove: (id: number) => void;
    /** Ticks or unticks a habit for a calendar date, defaulting to today. */
    toggle: (id: number, date?: string) => void;
};

export const useHabits = create<HabitsState>()(set => ({
    habits: hydrate<Habit[]>('habits', []),
    setHabits: next => set(s => ({ habits: resolve(next, s.habits) })),
    add: name => set(s => ({ habits: [...s.habits, { id: Date.now(), name, history: [] }] })),
    remove: id => set(s => ({ habits: s.habits.filter(h => h.id !== id) })),
    toggle: (id, date) => set(s => {
        const day = date ?? todayKey();
        return {
            habits: s.habits.map(h => {
                if (h.id !== id) return h;
                const done = h.history.includes(day);
                return { ...h, history: done ? h.history.filter(d => d !== day) : [...h.history, day] };
            }),
        };
    }),
}));

persistSlice(useHabits, 'habits', s => s.habits);

export const selectHabits = (s: HabitsState) => s.habits;

/** How many habits are ticked for today — the Today surface's headline number. */
export const selectDoneToday = (s: HabitsState) =>
    s.habits.filter(h => h.history.includes(todayKey())).length;
