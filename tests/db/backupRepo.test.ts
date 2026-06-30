import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'
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
  it('export excludes the PIN hash', async () => {
    await db.settings.put({ id: 'singleton', pinSalt: 's', pinHash: 'h', theme: 'system', defaultCurrency: 'USD', schemaVersion: SCHEMA_VERSION })
    const json = await exportBackup()
    const parsed = JSON.parse(json)
    expect(parsed.settings.pinSalt).toBeUndefined()
    expect(parsed.settings.pinHash).toBeUndefined()
  })
  it('import preserves the device PIN', async () => {
    await db.settings.put({ id: 'singleton', pinSalt: 'dev', pinHash: 'dev', theme: 'system', defaultCurrency: 'USD', schemaVersion: SCHEMA_VERSION })
    const backupJson = JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      accounts: [],
      categories: [],
      transactions: [],
      settings: { id: 'singleton', pinSalt: 'other', pinHash: 'other', theme: 'system', defaultCurrency: 'USD', schemaVersion: SCHEMA_VERSION },
    })
    await importBackup(backupJson)
    const after = await db.settings.get('singleton')
    expect(after?.pinSalt).toBe('dev')
    expect(after?.pinHash).toBe('dev')
  })
})
