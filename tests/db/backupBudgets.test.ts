import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with budgets', () => {
  it('round-trips budgets in export/import', async () => {
    await db.budgets.add({ id: 'b1', categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR', createdAt: 't', updatedAt: 't' })
    const json = await exportBackup()
    expect(JSON.parse(json).budgets).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.budgets.count()).toBe(1)
  })
  it('accepts a v1 backup (no budgets field) and imports zero budgets', async () => {
    const v1 = JSON.stringify({
      schemaVersion: 1, exportedAt: 't',
      accounts: [{ id: 'a1', name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0, isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' }],
      categories: [], transactions: [], settings: null,
    })
    await importBackup(v1)
    expect(await db.accounts.count()).toBe(1)
    expect(await db.budgets.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
