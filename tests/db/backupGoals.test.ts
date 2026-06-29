import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with goals', () => {
  it('round-trips goals and contributions', async () => {
    await db.goals.add({ id: 'g1', name: 'سفر', targetAmount: 100000, currency: 'EUR', icon: 'target', color: '#1', isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' })
    await db.goalContributions.add({ id: 'c1', goalId: 'g1', amount: 5000, date: '2026-06-01', createdAt: 't' })
    const json = await exportBackup()
    const parsed = JSON.parse(json)
    expect(parsed.goals).toHaveLength(1)
    expect(parsed.goalContributions).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.goals.count()).toBe(1)
    expect(await db.goalContributions.count()).toBe(1)
  })
  it('accepts a v2 backup (no goals fields) and imports zero goals', async () => {
    const v2 = JSON.stringify({
      schemaVersion: 2, exportedAt: 't',
      accounts: [], categories: [], transactions: [], settings: null, budgets: [],
    })
    await importBackup(v2)
    expect(await db.goals.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
