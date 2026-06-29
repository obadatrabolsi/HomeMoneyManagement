import { create } from 'zustand'
import type { TxFilter } from '../db/transactionsRepo'
import type { Settings } from '../db/types'

interface UiState {
  theme: Settings['theme']
  setTheme: (t: Settings['theme']) => void
  filter: TxFilter
  setFilter: (patch: Partial<TxFilter>) => void
  resetFilter: () => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  filter: {},
  setFilter: (patch) => set((s) => ({ filter: { ...s.filter, ...patch } })),
  resetFilter: () => set({ filter: {} }),
}))
