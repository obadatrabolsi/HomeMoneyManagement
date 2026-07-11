import { create } from 'zustand'

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline'

interface SyncStore {
  status: SyncStatus
  lastSyncedAt: string | null
  error: string | null
  set: (patch: Partial<Pick<SyncStore, 'status' | 'lastSyncedAt' | 'error'>>) => void
}

/** Ephemeral cloud-sync status (drives the sync-status UI header). */
export const useSyncStore = create<SyncStore>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,
  set: (patch) => set(patch),
}))
