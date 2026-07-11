import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../src/db/reportsRepo'
import { createAccount } from '../../src/db/accountsRepo'

let eur = '', usd = ''
beforeEach(async () => {
  await db.delete(); await db.open()
  eur = (await createAccount({ name: 'E', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })).id
  usd = (await createAccount({ name: 'U', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })).id
})

async function tx(p: any) {
  await db.transactions.add({ id: crypto.randomUUID(), tags: [], createdAt: 't', updatedAt: 't', ...p })
}

describe('reportsRepo', () => {
  it('income/expense totals are account-scoped and exclude transfers + deleted', async () => {
    await tx({ type: 'income', amount: 9000, accountId: eur, date: '2026-06-01' })
    await tx({ type: 'expense', amount: 2000, accountId: eur, date: '2026-06-02' })
    await tx({ type: 'expense', amount: 999, accountId: eur, date: '2026-06-03', deletedAt: 't' })
    await tx({ type: 'transfer', transferDirection: 'out', amount: 500, accountId: eur, date: '2026-06-04' })
    await tx({ type: 'expense', amount: 7777, accountId: usd, date: '2026-06-05' }) // other account
    expect(await incomeExpenseTotals('2026-06-01', '2026-06-30', eur)).toEqual({ income: 9000, expense: 2000, net: 7000 })
  })
  it('category spending grouped and descending (single account only)', async () => {
    await tx({ type: 'expense', amount: 500, accountId: eur, categoryId: 'food', date: '2026-06-01' })
    await tx({ type: 'expense', amount: 300, accountId: eur, categoryId: 'food', date: '2026-06-02' })
    await tx({ type: 'expense', amount: 1000, accountId: eur, categoryId: 'rent', date: '2026-06-03' })
    await tx({ type: 'expense', amount: 9999, accountId: usd, categoryId: 'food', date: '2026-06-04' })
    expect(await categorySpending('2026-06-01', '2026-06-30', eur)).toEqual([
      { categoryId: 'rent', total: 1000 },
      { categoryId: 'food', total: 800 },
    ])
  })
  it('monthly totals returns 12 entries with per-month income/expense', async () => {
    await tx({ type: 'income', amount: 5000, accountId: eur, date: '2026-01-15' })
    await tx({ type: 'expense', amount: 2000, accountId: eur, date: '2026-03-10' })
    const series = await monthlyTotals(2026, eur)
    expect(series).toHaveLength(12)
    expect(series[0]).toEqual({ month: '2026-01', income: 5000, expense: 0 })
    expect(series[2]).toEqual({ month: '2026-03', income: 0, expense: 2000 })
  })
  it('statistics: largest tx, avg daily expense, top category, most-used account, count', async () => {
    await tx({ type: 'expense', amount: 500, accountId: eur, categoryId: 'food', date: '2026-06-01' })
    await tx({ type: 'expense', amount: 1500, accountId: eur, categoryId: 'food', date: '2026-06-02' })
    await tx({ type: 'income', amount: 9000, accountId: eur, date: '2026-06-03' })
    const s = await statistics('2026-06-01', '2026-06-02', eur) // 2-day window
    expect(s.transactionCount).toBe(2)
    expect(s.largestExpense?.amount).toBe(1500)
    expect(s.largestIncome).toBeNull() // income on 06-03 is outside the window
    expect(s.avgDailyExpense).toBe(1000) // (500+1500)/2 days
    expect(s.topCategoryId).toBe('food')
    expect(s.topCategoryTotal).toBe(2000)
    expect(s.mostUsedAccountId).toBe(eur)
  })
})
