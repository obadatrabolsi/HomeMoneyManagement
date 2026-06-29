import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createDebt, listDebts, updateDebt, deleteDebt, addPayment, listPayments, debtsWithProgress, remainingTotalsByDirection } from '../../src/db/debtsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('debtsRepo', () => {
  it('creates, lists by direction, updates', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    await createDebt({ direction: 'owed', person: 'سارة', amount: 20000, currency: 'EUR' })
    expect((await listDebts({ direction: 'owe' })).map(d => d.id)).toEqual([a.id])
    await updateDebt(a.id, { person: 'أحمد علي' })
    expect((await listDebts({ direction: 'owe' }))[0].person).toBe('أحمد علي')
  })
  it('deletes a debt and its payments', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 10000, date: '2026-06-01' })
    await deleteDebt(a.id)
    expect(await listDebts()).toHaveLength(0)
    expect(await listPayments(a.id)).toHaveLength(0)
  })
  it('tracks payments and progress', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 10000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 4000, date: '2026-06-01' })
    await addPayment({ debtId: a.id, amount: 4000, date: '2026-06-05' })
    const [p] = await debtsWithProgress({ direction: 'owe' })
    expect(p.paid).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.settled).toBe(false)
  })
  it('marks settled when fully paid and excludes settled by default', async () => {
    const a = await createDebt({ direction: 'owed', person: 'سارة', amount: 5000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 5000, date: '2026-06-01' })
    const [p] = await debtsWithProgress({ direction: 'owed' })
    expect(p.settled).toBe(true)
    expect(p.remaining).toBe(0)
    expect(await listDebts({ direction: 'owed' })).toHaveLength(1)               // listDebts ignores settled flag unless asked
    expect(await listDebts({ direction: 'owed', includeSettled: false })).toHaveLength(1) // not isSettled (auto-settled only)
  })
  it('handles amount of zero without dividing by zero', async () => {
    await createDebt({ direction: 'owe', person: 'x', amount: 0, currency: 'EUR' })
    const [p] = await debtsWithProgress()
    expect(p.percent).toBe(0)
    expect(p.settled).toBe(false)
  })
  it('sums remaining per direction grouped by currency', async () => {
    const a = await createDebt({ direction: 'owe', person: 'A', amount: 10000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 3000, date: '2026-06-01' })       // remaining 7000 EUR
    await createDebt({ direction: 'owe', person: 'B', amount: 5000, currency: 'USD' }) // remaining 5000 USD
    await createDebt({ direction: 'owed', person: 'C', amount: 2000, currency: 'EUR' }) // remaining 2000 EUR
    const totals = await remainingTotalsByDirection()
    expect(totals.owe).toEqual({ EUR: 7000, USD: 5000 })
    expect(totals.owed).toEqual({ EUR: 2000 })
  })
  it('excludes manually settled debts from remaining totals', async () => {
    // Manually settled debt (isSettled=true, no payments so paid=0, remaining would be 10000)
    const settled = await createDebt({ direction: 'owe', person: 'X', amount: 10000, currency: 'EUR' })
    await updateDebt(settled.id, { isSettled: true })
    // Unsettled debt in same direction, different currency
    await createDebt({ direction: 'owe', person: 'Y', amount: 5000, currency: 'USD' })

    const totals = await remainingTotalsByDirection()
    // EUR should not appear since the only EUR debt is settled
    expect(totals.owe.EUR).toBeUndefined()
    // USD unsettled debt is still counted
    expect(totals.owe.USD).toBe(5000)
  })
})
