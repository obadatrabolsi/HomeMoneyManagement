import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v4', () => {
  it('is version 4 and exposes recurringRules', () => {
    expect(SCHEMA_VERSION).toBe(4)
    expect(db.recurringRules).toBeTruthy()
  })
  it('round-trips a recurring rule', async () => {
    await db.recurringRules.add({ id: 'r1', type: 'expense', amount: 2000, accountId: 'a1', tags: [], frequency: 'monthly', interval: 1, startDate: '2026-06-01', nextRunDate: '2026-06-01', isActive: true, createdAt: 't', updatedAt: 't' })
    expect((await db.recurringRules.get('r1'))?.amount).toBe(2000)
  })
})
