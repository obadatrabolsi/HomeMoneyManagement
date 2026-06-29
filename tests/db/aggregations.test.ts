import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { dayTotals, rangeTotals, categoryBreakdown } from '../../src/db/transactionsRepo'

beforeEach(async () => {
  await db.delete(); await db.open()
  await db.transactions.bulkAdd([
    { id: '1', type: 'expense', amount: 500, accountId: 'a', categoryId: 'food', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
    { id: '2', type: 'expense', amount: 300, accountId: 'a', categoryId: 'food', date: '2026-06-02', tags: [], createdAt: 't', updatedAt: 't' },
    { id: '3', type: 'income', amount: 9000, accountId: 'a', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
    { id: '4', type: 'expense', amount: 200, accountId: 'a', categoryId: 'fuel', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
    { id: '5', type: 'transfer', transferDirection: 'out', amount: 1000, accountId: 'a', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' },
  ])
})

describe('aggregations', () => {
  it('computes day totals excluding transfers', async () => {
    expect(await dayTotals('2026-06-01')).toEqual({ income: 9000, expense: 700 })
  })
  it('computes range totals', async () => {
    expect(await rangeTotals('2026-06-01', '2026-06-30')).toEqual({ income: 9000, expense: 1000 })
  })
  it('breaks expenses down by category descending', async () => {
    expect(await categoryBreakdown('2026-06-01', '2026-06-30')).toEqual([
      { categoryId: 'food', total: 800 },
      { categoryId: 'fuel', total: 200 },
    ])
  })
})
