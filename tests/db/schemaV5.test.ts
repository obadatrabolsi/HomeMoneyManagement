import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v5', () => {
  it('is version 5 and exposes debts + debtPayments', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(5)
    expect(db.debts).toBeTruthy()
    expect(db.debtPayments).toBeTruthy()
  })
  it('round-trips a debt and a payment', async () => {
    await db.debts.add({ id: 'd1', direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR', isSettled: false, createdAt: 't', updatedAt: 't' })
    await db.debtPayments.add({ id: 'p1', debtId: 'd1', amount: 10000, date: '2026-06-01', createdAt: 't' })
    expect((await db.debts.get('d1'))?.person).toBe('أحمد')
    expect((await db.debtPayments.get('p1'))?.amount).toBe(10000)
  })
})
