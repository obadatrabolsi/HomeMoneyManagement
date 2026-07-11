import type Dexie from 'dexie'
import { db } from './schema'

function nowIso(): string {
  return new Date().toISOString()
}

/**
 * Tables that participate in cloud sync. `settings` is intentionally excluded
 * (local only — it holds the PIN salt/hash), and `attachments` is excluded for
 * now (binary blobs go to Supabase Storage in a later phase).
 */
export const SYNCED_TABLES = [
  'accounts', 'categories', 'transactions', 'budgets', 'goals',
  'goalContributions', 'recurringRules', 'debts', 'debtPayments',
] as const
export type SyncedTable = (typeof SYNCED_TABLES)[number]

/**
 * Install create/update hooks that keep `updatedAt` and `syncState` in step.
 * Every local write marks the row `pending`; because a soft-delete is just an
 * update that sets `deletedAt`, tombstones are marked pending automatically.
 * The sync engine marks rows `synced` explicitly (see {@link markSynced}), and
 * pulled rows arrive with their own `syncState`/`updatedAt` — both are honoured.
 */
/** Minimal view of the two Dexie hooks we use, to sidestep the noisy overloads. */
interface HookableTable {
  hook(name: 'creating', cb: (primKey: unknown, obj: Record<string, unknown>) => void): void
  hook(name: 'updating', cb: (mods: Record<string, unknown>) => Record<string, unknown> | undefined): void
}

export function installSyncHooks(database: Dexie): void {
  for (const name of SYNCED_TABLES) {
    const table = database.table(name) as unknown as HookableTable
    table.hook('creating', (_pk, obj) => {
      if (obj.syncState === undefined) obj.syncState = 'pending'
      if (obj.updatedAt === undefined) obj.updatedAt = nowIso()
    })
    table.hook('updating', (mods) => {
      // Respect explicit syncState writes (the sync engine marking rows synced,
      // or a pulled row being applied) — don't force them back to pending.
      if ('syncState' in mods) return undefined
      const extra: Record<string, unknown> = { syncState: 'pending' }
      if (!('updatedAt' in mods)) extra.updatedAt = nowIso()
      return extra
    })
  }
}

/** Mark the given rows of a table as synced (does not bump `updatedAt`). */
export async function markSynced(table: SyncedTable, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.table(table).where('id').anyOf(ids).modify({ syncState: 'synced' })
}

export interface PendingItem {
  table: SyncedTable
  id: string
  row: Record<string, unknown>
}

/** All not-yet-synced rows across every synced table (drives the sync UI). */
export async function listPending(): Promise<PendingItem[]> {
  const out: PendingItem[] = []
  for (const name of SYNCED_TABLES) {
    const rows = await db.table(name).where('syncState').equals('pending').toArray()
    for (const row of rows) out.push({ table: name, id: (row as { id: string }).id, row })
  }
  return out
}

/** Total number of not-yet-synced rows (drives the sync badge count). */
export async function pendingCount(): Promise<number> {
  let n = 0
  for (const name of SYNCED_TABLES) {
    n += await db.table(name).where('syncState').equals('pending').count()
  }
  return n
}
