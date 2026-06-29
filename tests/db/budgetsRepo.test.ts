import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createBudget, listBudgets, updateBudget, deleteBudget, budgetProgress } from '../../src/db/budgetsRepo'
import { createAccount } from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function addExpense(accountId: string, categoryId: string, amount: number, date: string) {
  await db.transactions.add({ id: crypto.randomUUID(), type: 'expense', amount, accountId, categoryId, date, tags: [], createdAt: 't', updatedAt: 't' })
}

describe('budgetsRepo', () => {
  it('creates, lists, updates and deletes', async () => {
    const b = await createBudget({ categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR' })
    expect((await listBudgets('2026-06')).map(x => x.id)).toEqual([b.id])
    await updateBudget(b.id, { amount: 40000 })
    expect((await listBudgets('2026-06'))[0].amount).toBe(40000)
    await deleteBudget(b.id)
    expect(await listBudgets('2026-06')).toHaveLength(0)
  })
  it('rejects a duplicate for same category+month+currency', async () => {
    await createBudget({ categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR' })
    await expect(createBudget({ categoryId: 'food', month: '2026-06', amount: 1, currency: 'EUR' }))
      .rejects.toThrow('DUPLICATE_BUDGET')
  })
  it('computes spent/remaining/percent/status from same-currency expenses in the month', async () => {
    const eur = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const usd = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })
    await createBudget({ categoryId: 'food', month: '2026-06', amount: 10000, currency: 'EUR' })
    await addExpense(eur.id, 'food', 8000, '2026-06-03')   // counts
    await addExpense(eur.id, 'food', 1000, '2026-05-30')   // wrong month, ignored
    await addExpense(usd.id, 'food', 5000, '2026-06-04')   // wrong currency, ignored
    const [p] = await budgetProgress('2026-06')
    expect(p.spent).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.status).toBe('near')
  })
  it('marks over when at or above 100 percent', async () => {
    const eur = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createBudget({ categoryId: 'rent', month: '2026-06', amount: 5000, currency: 'EUR' })
    await addExpense(eur.id, 'rent', 6000, '2026-06-10')
    const [p] = await budgetProgress('2026-06')
    expect(p.status).toBe('over')
    expect(p.percent).toBe(120)
    expect(p.remaining).toBe(-1000)
  })
})
