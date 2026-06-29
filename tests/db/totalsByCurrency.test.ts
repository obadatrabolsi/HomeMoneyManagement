import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { rangeTotalsByCurrency, dayTotalsByCurrency } from '../../src/db/transactionsRepo'

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('rangeTotalsByCurrency', () => {
  it('groups income and expense per currency without merging', async () => {
    const eurAcc = await createAccount({ name: 'EUR Acc', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const usdAcc = await createAccount({ name: 'USD Acc', icon: 'w', color: '#2', currency: 'USD', initialBalance: 0 })

    await db.transactions.bulkAdd([
      { id: 't1', type: 'income', amount: 5000, accountId: eurAcc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't2', type: 'expense', amount: 1000, accountId: eurAcc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't3', type: 'income', amount: 8000, accountId: usdAcc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't4', type: 'expense', amount: 2000, accountId: usdAcc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
    ])

    const result = await rangeTotalsByCurrency('2026-06-01', '2026-06-30')

    expect(result['EUR']).toEqual({ income: 5000, expense: 1000 })
    expect(result['USD']).toEqual({ income: 8000, expense: 2000 })
    // Verify they are not merged
    expect(Object.keys(result)).toHaveLength(2)
  })

  it('excludes soft-deleted transactions', async () => {
    const acc = await createAccount({ name: 'Test', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })

    await db.transactions.bulkAdd([
      { id: 't1', type: 'income', amount: 5000, accountId: acc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't2', type: 'income', amount: 3000, accountId: acc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x', deletedAt: '2026-06-02T00:00:00.000Z' },
    ])

    const result = await rangeTotalsByCurrency('2026-06-01', '2026-06-30')
    expect(result['EUR']).toEqual({ income: 5000, expense: 0 })
  })

  it('excludes transfer transactions', async () => {
    const acc = await createAccount({ name: 'Test', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })

    await db.transactions.bulkAdd([
      { id: 't1', type: 'income', amount: 5000, accountId: acc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't2', type: 'transfer', transferDirection: 'out', amount: 1000, accountId: acc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
    ])

    const result = await rangeTotalsByCurrency('2026-06-01', '2026-06-30')
    expect(result['EUR']).toEqual({ income: 5000, expense: 0 })
  })

  it('excludes transactions outside the date range', async () => {
    const acc = await createAccount({ name: 'Test', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })

    await db.transactions.bulkAdd([
      { id: 't1', type: 'income', amount: 5000, accountId: acc.id, date: '2026-06-01', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't2', type: 'income', amount: 9999, accountId: acc.id, date: '2026-07-01', tags: [], createdAt: 'x', updatedAt: 'x' },
    ])

    const result = await rangeTotalsByCurrency('2026-06-01', '2026-06-30')
    expect(result['EUR']).toEqual({ income: 5000, expense: 0 })
  })

  it('dayTotalsByCurrency delegates to rangeTotalsByCurrency for a single day', async () => {
    const acc = await createAccount({ name: 'Test', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })

    await db.transactions.bulkAdd([
      { id: 't1', type: 'expense', amount: 2500, accountId: acc.id, date: '2026-06-15', tags: [], createdAt: 'x', updatedAt: 'x' },
      { id: 't2', type: 'expense', amount: 1000, accountId: acc.id, date: '2026-06-16', tags: [], createdAt: 'x', updatedAt: 'x' },
    ])

    const result = await dayTotalsByCurrency('2026-06-15')
    expect(result['EUR']).toEqual({ income: 0, expense: 2500 })
  })
})
