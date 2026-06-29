import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { queryTransactions, recentTransactions } from '../../src/db/transactionsRepo'

beforeEach(async () => {
  await db.delete(); await db.open()
  await db.transactions.bulkAdd([
    { id: '1', type: 'expense', amount: 500, accountId: 'a1', categoryId: 'food', date: '2026-06-01', tags: ['عمل'], merchant: 'مقهى', notes: 'قهوة', createdAt: 't1', updatedAt: 't1' },
    { id: '2', type: 'income', amount: 9000, accountId: 'a1', date: '2026-06-10', tags: [], createdAt: 't2', updatedAt: 't2' },
    { id: '3', type: 'expense', amount: 1500, accountId: 'a2', date: '2026-05-20', tags: ['سفر'], createdAt: 't3', updatedAt: 't3' },
    { id: '4', type: 'expense', amount: 200, accountId: 'a1', date: '2026-06-05', tags: [], deletedAt: 'x', createdAt: 't4', updatedAt: 't4' },
  ])
})

describe('queries', () => {
  it('excludes soft-deleted', async () => {
    const all = await queryTransactions({})
    expect(all.map(t => t.id)).not.toContain('4')
  })
  it('filters by account and type', async () => {
    expect((await queryTransactions({ accountId: 'a1', type: 'expense' })).map(t => t.id)).toEqual(['1'])
  })
  it('filters by date range', async () => {
    expect((await queryTransactions({ from: '2026-06-01', to: '2026-06-30' })).map(t => t.id).sort()).toEqual(['1', '2'])
  })
  it('text search matches merchant/notes/tags', async () => {
    expect((await queryTransactions({ text: 'قهوة' })).map(t => t.id)).toEqual(['1'])
    expect((await queryTransactions({ text: 'سفر' })).map(t => t.id)).toEqual(['3'])
  })
  it('text search matches exact amount in major units', async () => {
    expect((await queryTransactions({ text: '90' })).map(t => t.id)).toEqual(['2'])
  })
  it('sorts by amount desc', async () => {
    expect((await queryTransactions({ sort: 'amount_desc' })).map(t => t.id)).toEqual(['2', '3', '1'])
  })
  it('recent returns newest first limited', async () => {
    expect((await recentTransactions(2)).map(t => t.id)).toEqual(['2', '1'])
  })
})
