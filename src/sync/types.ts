import type { SyncedTable } from '../db/syncTracking'

/** One row as it lives in the cloud `sync_records` table. */
export interface RemoteRecord {
  table: SyncedTable
  id: string
  updatedAt: string
  deletedAt?: string | null
  /** The full client record, minus local-only fields (e.g. syncState). */
  doc: Record<string, unknown>
}

/**
 * The transport the sync engine talks to. The real implementation wraps
 * `@supabase/supabase-js`; tests use an in-memory fake. Keeping this abstract
 * lets the LWW/cursor/tombstone logic be verified without a live server.
 */
export interface RemoteAdapter {
  /** Rows for `table` whose updatedAt is strictly after `since`, ascending. */
  pull(table: SyncedTable, since: string): Promise<RemoteRecord[]>
  /** Upsert the given rows (keyed by table+id). */
  push(records: RemoteRecord[]): Promise<void>
}
