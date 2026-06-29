import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import {
  createTransaction, updateTransaction, softDeleteTransaction, undoDelete, toggleFavorite,
} from '../../src/db/transactionsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('transactionsRepo', () => {
  it('creates an expense with defaults', async () => {
    const t = await createTransaction({ type: 'expense', amount: 500, accountId: 'a1', date: '2026-06-01' })
    expect(t.amount).toBe(500)
    expect(t.tags).toEqual([])
    expect(t.deletedAt).toBeUndefined()
  })
  it('soft deletes and undoes', async () => {
    const t = await createTransaction({ type: 'income', amount: 900, accountId: 'a1', date: '2026-06-01' })
    const ids = await softDeleteTransaction(t.id)
    expect(ids).toEqual([t.id])
    expect((await db.transactions.get(t.id))?.deletedAt).toBeTruthy()
    await undoDelete(ids)
    expect((await db.transactions.get(t.id))?.deletedAt).toBeUndefined()
  })
  it('soft delete of a transfer leg removes the whole group', async () => {
    const gid = 'g1'
    await db.transactions.bulkAdd([
      { id: 'o', type: 'transfer', transferDirection: 'out', amount: 1000, accountId: 'a1', counterAccountId: 'a2', transferGroupId: gid, date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
      { id: 'i', type: 'transfer', transferDirection: 'in', amount: 1000, accountId: 'a2', counterAccountId: 'a1', transferGroupId: gid, date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
    ])
    const ids = await softDeleteTransaction('o')
    expect(ids.sort()).toEqual(['i', 'o'])
    expect((await db.transactions.get('i'))?.deletedAt).toBeTruthy()
  })
  it('toggles favorite', async () => {
    const t = await createTransaction({ type: 'expense', amount: 1, accountId: 'a1', date: '2026-06-01' })
    await toggleFavorite(t.id)
    expect((await db.transactions.get(t.id))?.isFavorite).toBe(true)
  })
})
