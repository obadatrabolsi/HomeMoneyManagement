import { create } from 'zustand'
import type { TxFilter } from '../db/transactionsRepo'
import type { Settings } from '../db/types'

interface UiState {
  theme: Settings['theme']
  setTheme: (t: Settings['theme']) => void
  filter: TxFilter
  filterInitialized: boolean
  setFilter: (patch: Partial<TxFilter>) => void
  resetFilter: () => void
  /** Seed the account filter with the default account once, on first use. */
  initFilterAccount: (accountId: string | undefined) => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  filter: {},
  filterInitialized: false,
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  resetFilter: () => set({ filter: {}, filterInitialized: false }),
  initFilterAccount: (accountId) =>
    set((s) => (s.filterInitialized || !accountId
      ? s
      : { filter: { ...s.filter, accountId }, filterInitialized: true })),
}))
