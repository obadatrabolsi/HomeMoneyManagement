import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backupRepo', () => {
  it('round-trips a full export/import', async () => {
    await db.accounts.add({ id: 'a1', name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 100, isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' })
    await db.transactions.add({ id: 't1', type: 'expense', amount: 50, accountId: 'a1', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' })
    const json = await exportBackup()

    await db.delete(); await db.open()
    expect(await db.accounts.count()).toBe(0)

    await importBackup(json)
    expect(await db.accounts.count()).toBe(1)
    expect(await db.transactions.count()).toBe(1)
  })
  it('rejects incompatible version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
  it('rejects malformed json', async () => {
    await expect(importBackup('{not json')).rejects.toThrow('INVALID_BACKUP')
  })
  it('rejects backup where optional table field is not an array', async () => {
    const bad = JSON.stringify({ schemaVersion: 5, accounts: [], transactions: 'oops' })
    await expect(importBackup(bad)).rejects.toThrow('INVALID_BACKUP')
  })
})
