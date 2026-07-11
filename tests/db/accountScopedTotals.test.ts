import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { rangeTotals, categoryBreakdown } from '../../src/db/transactionsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function seedTwoAccounts() {
  const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
  const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
  await createTransaction({ type: 'income', amount: 1000, accountId: a.id, date: '2026-06-10', categoryId: 'c1' })
  await createTransaction({ type: 'expense', amount: 400, accountId: a.id, date: '2026-06-11', categoryId: 'c1' })
  await createTransaction({ type: 'income', amount: 5000, accountId: b.id, date: '2026-06-10', categoryId: 'c2' })
  await createTransaction({ type: 'expense', amount: 700, accountId: b.id, date: '2026-06-12', categoryId: 'c2' })
  return { a, b }
}

describe('rangeTotals with account scope', () => {
  it('sums all accounts when no accountId is given', async () => {
    await seedTwoAccounts()
    const t = await rangeTotals('2026-06-01', '2026-06-30')
    expect(t).toEqual({ income: 6000, expense: 1100 })
  })

  it('sums only the given account when accountId is provided', async () => {
    const { a } = await seedTwoAccounts()
    const t = await rangeTotals('2026-06-01', '2026-06-30', a.id)
    expect(t).toEqual({ income: 1000, expense: 400 })
  })
})

describe('categoryBreakdown with account scope', () => {
  it('breaks down expenses for a single account only', async () => {
    const { b } = await seedTwoAccounts()
    const rows = await categoryBreakdown('2026-06-01', '2026-06-30', b.id)
    expect(rows).toEqual([{ categoryId: 'c2', total: 700 }])
  })
})
