import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { pushPending, pullAll, syncOnce } from '../../src/sync/engine'
import type { RemoteAdapter, RemoteRecord } from '../../src/sync/types'
import type { SyncedTable } from '../../src/db/syncTracking'

/** In-memory stand-in for the Supabase adapter, keyed like the real table. */
class FakeRemote implements RemoteAdapter {
  store = new Map<string, RemoteRecord>()
  async pull(table: SyncedTable, since: string): Promise<RemoteRecord[]> {
    return [...this.store.values()]
      .filter(r => r.table === table && r.updatedAt > since)
      .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
      .map(r => ({ ...r, doc: { ...r.doc } }))
  }
  async push(records: RemoteRecord[]): Promise<void> {
    for (const r of records) this.store.set(`${r.table}:${r.id}`, { ...r, doc: { ...r.doc } })
  }
  get(table: SyncedTable, id: string) { return this.store.get(`${table}:${id}`) }
}

beforeEach(async () => { await db.delete(); await db.open() })

describe('sync engine', () => {
  it('pushes pending rows to remote and marks them synced, without leaking local-only fields', async () => {
    const remote = new FakeRemote()
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 1000 })

    const pushed = await pushPending(remote)

    expect(pushed).toBeGreaterThanOrEqual(1)
    expect((await db.accounts.get(a.id))?.syncState).toBe('synced')
    const rec = remote.get('accounts', a.id)!
    expect(rec.doc.name).toBe('نقد')
    expect(rec.updatedAt).toBeTruthy()
    expect('syncState' in rec.doc).toBe(false) // local-only, not uploaded
  })

  it('pulls remote rows into an empty db as synced and advances the cursor', async () => {
    const remote = new FakeRemote()
    await remote.push([{
      table: 'accounts', id: 'x1', updatedAt: '2026-07-01T00:00:00.000Z', deletedAt: null,
      doc: { id: 'x1', name: 'بنك', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0, isArchived: false, sortOrder: 0, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
    }])

    const applied = await pullAll(remote)

    expect(applied).toBe(1)
    const row = await db.accounts.get('x1')
    expect(row?.name).toBe('بنك')
    expect(row?.syncState).toBe('synced')
    expect((await db.syncMeta.get('accounts'))?.lastPulledAt).toBe('2026-07-01T00:00:00.000Z')
    // Re-pulling applies nothing (cursor already past it).
    expect(await pullAll(remote)).toBe(0)
  })

  it('resolves conflicts by last-write-wins on updatedAt (remote newer wins)', async () => {
    const remote = new FakeRemote()
    const a = await createAccount({ name: 'أصل', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await pushPending(remote)

    const local = (await db.accounts.get(a.id))!
    await remote.push([{
      table: 'accounts', id: a.id, updatedAt: '2999-01-01T00:00:00.000Z', deletedAt: null,
      doc: { ...local, name: 'محدّث', updatedAt: '2999-01-01T00:00:00.000Z', syncState: undefined },
    }])

    await pullAll(remote)
    expect((await db.accounts.get(a.id))?.name).toBe('محدّث')
  })

  it('keeps the local version when it is newer than remote (local wins, still pending)', async () => {
    const remote = new FakeRemote()
    const a = await createAccount({ name: 'محلي', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    // Remote holds an OLD version — after epoch (so the pull returns it) but well
    // before the just-created local row, so the LWW compare must skip it.
    const OLD = '2000-01-01T00:00:00.000Z'
    await remote.push([{
      table: 'accounts', id: a.id, updatedAt: OLD, deletedAt: null,
      doc: { id: a.id, name: 'قديم', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0, isArchived: false, sortOrder: 0, createdAt: OLD, updatedAt: OLD },
    }])

    await pullAll(remote)
    // Local (newer) untouched and still pending for upload.
    const row = await db.accounts.get(a.id)
    expect(row?.name).toBe('محلي')
    expect(row?.syncState).toBe('pending')
  })

  it('propagates deletes as tombstones on pull', async () => {
    const remote = new FakeRemote()
    await remote.push([{
      table: 'debts', id: 'd1', updatedAt: '2026-07-02T00:00:00.000Z', deletedAt: '2026-07-02T00:00:00.000Z',
      doc: { id: 'd1', direction: 'owe', person: 'x', amount: 1000, currency: 'EUR', isSettled: false, createdAt: '2026-07-01', updatedAt: '2026-07-02T00:00:00.000Z', deletedAt: '2026-07-02T00:00:00.000Z' },
    }])

    await pullAll(remote)
    expect((await db.debts.get('d1'))?.deletedAt).toBeTruthy()
  })

  it('syncOnce pulls then pushes and reports counts', async () => {
    const remote = new FakeRemote()
    await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const { pushed, pulled } = await syncOnce(remote)
    expect(pushed).toBeGreaterThanOrEqual(1)
    expect(pulled).toBe(0)
  })
})
