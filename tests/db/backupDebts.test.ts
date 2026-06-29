import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with debts', () => {
  it('round-trips debts and payments', async () => {
    await db.debts.add({ id: 'd1', direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR', isSettled: false, createdAt: 't', updatedAt: 't' })
    await db.debtPayments.add({ id: 'p1', debtId: 'd1', amount: 10000, date: '2026-06-01', createdAt: 't' })
    const json = await exportBackup()
    const parsed = JSON.parse(json)
    expect(parsed.debts).toHaveLength(1)
    expect(parsed.debtPayments).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.debts.count()).toBe(1)
    expect(await db.debtPayments.count()).toBe(1)
  })
  it('accepts a v4 backup (no debts fields)', async () => {
    const v4 = JSON.stringify({ schemaVersion: 4, exportedAt: 't', accounts: [], categories: [], transactions: [], settings: null, budgets: [], goals: [], goalContributions: [], recurringRules: [] })
    await importBackup(v4)
    expect(await db.debts.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
