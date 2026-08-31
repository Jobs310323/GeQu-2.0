import { create } from 'zustand';
import { DEFAULT_FINANCE, type FinanceData } from '../features/finance/types';
import { hydrate, persistSlice } from './persist';
import { resolve } from './setter';
import type { Setter } from '../types/props';

// Money. Highly sensitive under the data classification (see
// docs/GEQU_ARCHITECTURE_AUDIT.md) -- and note that `FinanceData.pin` is a UI
// curtain, not a lock: Phase 12 either makes it real or drops the claim.

type FinanceState = {
    finance: FinanceData;
    setFinance: Setter<FinanceData>;
};

export const useFinance = create<FinanceState>()(set => ({
    finance: hydrate<FinanceData>('finance', DEFAULT_FINANCE),
    setFinance: next => set(s => ({ finance: resolve(next, s.finance) })),
}));

persistSlice(useFinance, 'finance', s => s.finance);

export const selectFinance = (s: FinanceState) => s.finance;
