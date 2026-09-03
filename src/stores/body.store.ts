import { create } from 'zustand';
import type { GymData } from '../types/domain';
import { EMPTY_GYM_DATA } from '../types/domain';
import { hydrate, persistSlices } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Physical activity: gym programs and sessions.

type BodyState = {
    gym: GymData;
    setGym: Setter<GymData>;
};

export const useBody = create<BodyState>()(set => ({
    gym: hydrate<GymData>('gym', EMPTY_GYM_DATA),
    setGym: next => set(s => ({ gym: resolve(next, s.gym) })),
}));

persistSlices(useBody, {
    gym: s => s.gym,
});

export const selectGym = (s: BodyState) => s.gym;
export const selectWorkouts = (s: BodyState) => s.gym.history;
