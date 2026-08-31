import { create } from 'zustand';
import type { DiaryEntry } from '../types/domain';
import { nowInstant } from '../lib/datetime';
import { hydrate, persistSlice } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

type JournalState = {
    entries: DiaryEntry[];
    setEntries: Setter<DiaryEntry[]>;
    /** Newest first — the journal reads in reverse chronological order. */
    add: (content: string) => void;
    remove: (id: number) => void;
};

export const useJournal = create<JournalState>()(set => ({
    entries: hydrate<DiaryEntry[]>('diary', []),
    setEntries: next => set(s => ({ entries: resolve(next, s.entries) })),
    add: content => set(s => ({ entries: [{ id: Date.now(), date: nowInstant(), content }, ...s.entries] })),
    remove: id => set(s => ({ entries: s.entries.filter(e => e.id !== id) })),
}));

persistSlice(useJournal, 'diary', s => s.entries);

export const selectEntries = (s: JournalState) => s.entries;
