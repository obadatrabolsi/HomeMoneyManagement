import { getSupabase, currentUserId } from '../db/supabase'
import type { RemoteAdapter, RemoteRecord } from './types'
import type { SyncedTable } from '../db/syncTracking'

interface SyncRow {
  table_name: string
  id: string
  updated_at: string
  deleted_at: string | null
  doc: Record<string, unknown>
}

/**
 * Concrete {@link RemoteAdapter} over the Supabase `sync_records` table.
 * Thin by design — the LWW/cursor/tombstone logic is in the engine (and tested
 * against a fake adapter); this only maps to/from the wire shape.
 */
export const supabaseAdapter: RemoteAdapter = {
  async pull(table: SyncedTable, since: string): Promise<RemoteRecord[]> {
    const { data, error } = await getSupabase()
      .from('sync_records')
      .select('table_name,id,updated_at,deleted_at,doc')
      .eq('table_name', table)
      .gt('updated_at', since)
      .order('updated_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: SyncRow) => ({
      table: r.table_name as SyncedTable,
      id: r.id,
      updatedAt: r.updated_at,
      deletedAt: r.deleted_at,
      doc: r.doc,
    }))
  },

  async push(records: RemoteRecord[]): Promise<void> {
    if (records.length === 0) return
    const userId = await currentUserId()
    if (!userId) throw new Error('NOT_AUTHENTICATED')
    const rows = records.map(r => ({
      user_id: userId,
      table_name: r.table,
      id: r.id,
      updated_at: r.updatedAt,
      deleted_at: r.deletedAt ?? null,
      doc: r.doc,
    }))
    const { error } = await getSupabase()
      .from('sync_records')
      .upsert(rows, { onConflict: 'user_id,table_name,id' })
    if (error) throw error
  },
}
