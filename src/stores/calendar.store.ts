import { create } from 'zustand';
import type { Reminder } from '../types/domain';
import { todayKey } from '../lib/datetime';
import { hydrate, persistSlice } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

type CalendarState = {
    reminders: Reminder[];
    setReminders: Setter<Reminder[]>;
};

export const useCalendar = create<CalendarState>()(set => ({
    reminders: hydrate<Reminder[]>('reminders', []),
    setReminders: next => set(s => ({ reminders: resolve(next, s.reminders) })),
}));

persistSlice(useCalendar, 'reminders', s => s.reminders);

export const selectReminders = (s: CalendarState) => s.reminders;

/** Outstanding reminders from today onwards — the sidebar badge. */
export const selectUpcomingCount = (s: CalendarState) =>
    s.reminders.filter(r => !r.done && r.date >= todayKey()).length;
