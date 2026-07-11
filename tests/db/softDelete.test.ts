import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createDebt, deleteDebt, listDebts, addPayment, listPayments } from '../../src/db/debtsRepo'
import { createBudget, deleteBudget, listBudgets } from '../../src/db/budgetsRepo'
import { createRule, deleteRule, listRules, processDueRules } from '../../src/db/recurringRepo'
import { createAccount } from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('soft delete (tombstones so deletes can sync)', () => {
  it('deleteDebt tombstones the debt and its payments instead of removing them', async () => {
    const d = await createDebt({ direction: 'owe', person: 'أحمد', amount: 5000, currency: 'EUR' })
    await addPayment({ debtId: d.id, amount: 1000, date: '2026-06-01' })
    await deleteDebt(d.id)

    // Gone from the lists the UI reads...
    expect(await listDebts()).toHaveLength(0)
    expect(await listPayments(d.id)).toHaveLength(0)

    // ...but still present as pending tombstones so the delete propagates.
    const row = await db.debts.get(d.id)
    expect(row?.deletedAt).toBeTruthy()
    expect(row?.syncState).toBe('pending')
    const pay = await db.debtPayments.where('debtId').equals(d.id).first()
    expect(pay?.deletedAt).toBeTruthy()
    expect(pay?.syncState).toBe('pending')
  })

  it('deleteBudget tombstones the budget and frees its category+month slot', async () => {
    const b = await createBudget({ categoryId: 'c1', month: '2026-07', amount: 10000, currency: 'EUR' })
    await deleteBudget(b.id)

    expect(await listBudgets('2026-07')).toHaveLength(0)
    expect((await db.budgets.get(b.id))?.deletedAt).toBeTruthy()

    // Re-creating the same slot must not trip the duplicate guard.
    await expect(
      createBudget({ categoryId: 'c1', month: '2026-07', amount: 20000, currency: 'EUR' }),
    ).resolves.toBeTruthy()
  })

  it('deleteRule tombstones the rule and stops it generating transactions', async () => {
    const acc = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const r = await createRule({ type: 'expense', amount: 500, accountId: acc.id, frequency: 'daily', interval: 1, startDate: '2026-07-01' })
    await deleteRule(r.id)

    expect(await listRules(true)).toHaveLength(0)
    expect((await db.recurringRules.get(r.id))?.deletedAt).toBeTruthy()

    const created = await processDueRules('2026-07-10')
    expect(created).toBe(0)
  })
})
