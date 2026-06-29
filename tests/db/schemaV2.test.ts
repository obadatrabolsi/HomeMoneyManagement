import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v2', () => {
  it('is version 2 and exposes the budgets table', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(2)
    expect(db.budgets).toBeTruthy()
  })
  it('round-trips a budget', async () => {
    await db.budgets.add({ id: 'b1', categoryId: 'c1', month: '2026-06', amount: 30000, currency: 'EUR', createdAt: 't', updatedAt: 't' })
    expect((await db.budgets.get('b1'))?.amount).toBe(30000)
  })
})
