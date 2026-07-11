import { db } from '../db/schema'
import { SYNCED_TABLES, markSynced, listPending, type SyncedTable } from '../db/syncTracking'
import type { RemoteAdapter, RemoteRecord } from './types'

const EPOCH = '1970-01-01T00:00:00.000Z'

/** Fields that live only on the device and must never be uploaded. */
const LOCAL_ONLY_FIELDS = ['syncState'] as const

function toRemoteRecord(table: SyncedTable, row: Record<string, unknown>): RemoteRecord {
  const doc: Record<string, unknown> = { ...row }
  for (const f of LOCAL_ONLY_FIELDS) delete doc[f]
  return {
    table,
    id: row.id as string,
    updatedAt: row.updatedAt as string,
    deletedAt: (row.deletedAt as string | undefined) ?? null,
    doc,
  }
}

/** Upload every not-yet-synced row, then mark the uploaded rows synced. */
export async function pushPending(adapter: RemoteAdapter): Promise<number> {
  const pending = await listPending()
  if (pending.length === 0) return 0

  const byTable = new Map<SyncedTable, { ids: string[]; records: RemoteRecord[] }>()
  for (const p of pending) {
    const bucket = byTable.get(p.table) ?? { ids: [], records: [] }
    bucket.ids.push(p.id)
    bucket.records.push(toRemoteRecord(p.table, p.row))
    byTable.set(p.table, bucket)
  }

  let pushed = 0
  for (const [table, { ids, records }] of byTable) {
    await adapter.push(records)
    await markSynced(table, ids)
    pushed += ids.length
  }
  return pushed
}

async function getCursor(table: SyncedTable): Promise<string> {
  const meta = await db.syncMeta.get(table)
  return meta?.lastPulledAt ?? EPOCH
}

async function setCursor(table: SyncedTable, cursor: string): Promise<void> {
  await db.syncMeta.put({ table, lastPulledAt: cursor })
}

/** Pull one table's remote changes and apply them with last-write-wins. */
export async function pullTable(adapter: RemoteAdapter, table: SyncedTable): Promise<number> {
  const since = await getCursor(table)
  const remote = await adapter.pull(table, since)
  const applied: string[] = []
  let maxCursor = since

  for (const r of remote) {
    const local = await db.table(table).get(r.id) as { updatedAt?: string } | undefined
    // LWW: apply only when the remote row is strictly newer (equal = same version).
    if (!local || r.updatedAt > (local.updatedAt ?? EPOCH)) {
      const row = {
        ...r.doc,
        updatedAt: r.updatedAt,
        deletedAt: r.deletedAt ?? undefined,
        syncState: 'synced' as const,
      }
      await db.table(table).put(row)
      applied.push(r.id)
    }
    if (r.updatedAt > maxCursor) maxCursor = r.updatedAt
  }

  // A put fires the "mark pending" hook for pre-existing rows; force them back
  // to synced (updatedAt was preserved because it was part of the change set).
  if (applied.length > 0) await markSynced(table, applied)
  if (maxCursor !== since) await setCursor(table, maxCursor)
  return applied.length
}

/** Pull every synced table. */
export async function pullAll(adapter: RemoteAdapter): Promise<number> {
  let total = 0
  for (const table of SYNCED_TABLES) total += await pullTable(adapter, table)
  return total
}

/** One full sync round: pull remote changes first (so LWW can win), then push. */
export async function syncOnce(adapter: RemoteAdapter): Promise<{ pushed: number; pulled: number }> {
  const pulled = await pullAll(adapter)
  const pushed = await pushPending(adapter)
  return { pushed, pulled }
}
