import { isSupabaseConfigured, currentUserId } from '../db/supabase'
import { supabaseAdapter } from './supabaseAdapter'
import { syncOnce } from './engine'
import { claimLocalDataForUser } from './claim'
import { useSyncStore } from '../stores/syncStore'
import type { RemoteAdapter } from './types'

let running = false

/** Run one sync round (guarded against overlap), updating the status store. */
export async function runSync(adapter: RemoteAdapter = supabaseAdapter): Promise<void> {
  if (!isSupabaseConfigured() || running) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    useSyncStore.getState().set({ status: 'offline' })
    return
  }
  running = true
  useSyncStore.getState().set({ status: 'syncing', error: null })
  try {
    await syncOnce(adapter)
    useSyncStore.getState().set({ status: 'idle', lastSyncedAt: new Date().toISOString() })
  } catch (e) {
    useSyncStore.getState().set({ status: 'error', error: (e as Error).message })
  } finally {
    running = false
  }
}

/** After a successful sign-in: adopt existing local data, then sync. */
export async function onLogin(): Promise<void> {
  const userId = await currentUserId()
  if (userId) await claimLocalDataForUser(userId)
  await runSync()
}

let started = false
let intervalId: ReturnType<typeof setInterval> | null = null

/** Start background sync: on reconnect, on an interval, and once immediately. */
export function startAutoSync(): void {
  if (started || !isSupabaseConfigured()) return
  started = true
  const trigger = () => { void runSync() }
  window.addEventListener('online', trigger)
  intervalId = setInterval(trigger, 60_000)
  void runSync()
}

export function stopAutoSync(): void {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  started = false
}
