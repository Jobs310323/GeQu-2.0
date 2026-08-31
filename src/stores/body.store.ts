import { create } from 'zustand';
import type { GymData } from '../types/domain';
import { EMPTY_GYM_DATA } from '../types/domain';
import type { ActivityLabel, DayRecord } from '../features/snowman/types';
import { hydrate, persistSlices } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Physical activity: gym programs and sessions, plus the Snowman daily-balance
// tracker, which spans body/mind/emotion but is logged the same way.

type BodyState = {
    gym: GymData;
    snowmanLabels: ActivityLabel[];
    snowmanDays: DayRecord[];
    setGym: Setter<GymData>;
    setSnowmanLabels: Setter<ActivityLabel[]>;
    setSnowmanDays: Setter<DayRecord[]>;
};

export const useBody = create<BodyState>()(set => ({
    gym: hydrate<GymData>('gym', EMPTY_GYM_DATA),
    snowmanLabels: hydrate<ActivityLabel[]>('snowmanLabels', []),
    snowmanDays: hydrate<DayRecord[]>('snowmanDays', []),
    setGym: next => set(s => ({ gym: resolve(next, s.gym) })),
    setSnowmanLabels: next => set(s => ({ snowmanLabels: resolve(next, s.snowmanLabels) })),
    setSnowmanDays: next => set(s => ({ snowmanDays: resolve(next, s.snowmanDays) })),
}));

persistSlices(useBody, {
    gym: s => s.gym,
    snowmanLabels: s => s.snowmanLabels,
    snowmanDays: s => s.snowmanDays,
});

export const selectGym = (s: BodyState) => s.gym;
export const selectWorkouts = (s: BodyState) => s.gym.history;
