import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with recurring rules', () => {
  it('round-trips recurring rules', async () => {
    await db.recurringRules.add({ id: 'r1', type: 'expense', amount: 2000, accountId: 'a1', tags: [], frequency: 'monthly', interval: 1, startDate: '2026-06-01', nextRunDate: '2026-06-01', isActive: true, createdAt: 't', updatedAt: 't' })
    const json = await exportBackup()
    expect(JSON.parse(json).recurringRules).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.recurringRules.count()).toBe(1)
  })
  it('accepts a v3 backup (no recurringRules field)', async () => {
    const v3 = JSON.stringify({ schemaVersion: 3, exportedAt: 't', accounts: [], categories: [], transactions: [], settings: null, budgets: [], goals: [], goalContributions: [] })
    await importBackup(v3)
    expect(await db.recurringRules.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
