import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v3', () => {
  it('is version 3 and exposes goals + goalContributions', () => {
    expect(SCHEMA_VERSION).toBeGreaterThanOrEqual(3)
    expect(db.goals).toBeTruthy()
    expect(db.goalContributions).toBeTruthy()
  })
  it('round-trips a goal and a contribution', async () => {
    await db.goals.add({ id: 'g1', name: 'سفر', targetAmount: 100000, currency: 'EUR', icon: 'plane', color: '#1', isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' })
    await db.goalContributions.add({ id: 'c1', goalId: 'g1', amount: 5000, date: '2026-06-01', createdAt: 't' })
    expect((await db.goals.get('g1'))?.name).toBe('سفر')
    expect((await db.goalContributions.get('c1'))?.amount).toBe(5000)
  })
})
