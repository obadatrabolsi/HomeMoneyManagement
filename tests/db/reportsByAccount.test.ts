import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../src/db/reportsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function seed() {
  const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
  const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
  await createTransaction({ type: 'income', amount: 1000, accountId: a.id, date: '2026-03-10', categoryId: 'food' })
  await createTransaction({ type: 'expense', amount: 400, accountId: a.id, date: '2026-03-11', categoryId: 'food' })
  await createTransaction({ type: 'expense', amount: 9999, accountId: b.id, date: '2026-03-11', categoryId: 'rent' })
  return { a, b }
}

describe('reportsRepo scoped by account', () => {
  it('incomeExpenseTotals scopes to the account', async () => {
    const { a } = await seed()
    expect(await incomeExpenseTotals('2026-03-01', '2026-03-31', a.id)).toEqual({ income: 1000, expense: 400, net: 600 })
  })

  it('categorySpending scopes to the account', async () => {
    const { a } = await seed()
    expect(await categorySpending('2026-03-01', '2026-03-31', a.id)).toEqual([{ categoryId: 'food', total: 400 }])
  })

  it('monthlyTotals scopes to the account', async () => {
    const { a } = await seed()
    const months = await monthlyTotals(2026, a.id)
    expect(months[2]).toEqual({ month: '2026-03', income: 1000, expense: 400 })
  })

  it('statistics scopes to the account', async () => {
    const { a } = await seed()
    const s = await statistics('2026-03-01', '2026-03-31', a.id)
    expect(s.transactionCount).toBe(2)
    expect(s.largestExpense?.amount).toBe(400)
    expect(s.mostUsedAccountId).toBe(a.id)
  })
})
