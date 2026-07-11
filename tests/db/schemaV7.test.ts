import { describe, it, expect, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

// This suite builds a legacy v6 database by hand, then opens the real v7 `db`
// so the actual upgrade runs against it. It therefore must NOT use the shared
// `db.delete()` beforeEach — it manages the database lifecycle itself.
beforeEach(async () => {
  await db.close()
  await Dexie.delete('money-manager')
})

const V6_STORES = {
  accounts: 'id, isArchived, sortOrder',
  categories: 'id, type, parentId, isArchived',
  transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
  settings: 'id',
  budgets: 'id, categoryId, month, [month+currency]',
  goals: 'id, isArchived, sortOrder',
  goalContributions: 'id, goalId',
  recurringRules: 'id, isActive, nextRunDate',
  debts: 'id, direction, isSettled',
  debtPayments: 'id, debtId',
  attachments: 'id, transactionId',
}

async function seedLegacyV6() {
  const legacy = new Dexie('money-manager')
  legacy.version(6).stores(V6_STORES)
  await legacy.open()
  // Account already carried updatedAt in v6.
  await legacy.table('accounts').add({
    id: 'a1', name: 'نقد', icon: 'w', color: '#1', currency: 'EUR',
    initialBalance: 1000, isArchived: false, sortOrder: 0,
    createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z',
  })
  // Category had NO updatedAt in v6 — must be backfilled.
  await legacy.table('categories').add({
    id: 'c1', name: 'طعام', type: 'expense', icon: 'x', color: '#2', sortOrder: 0, isArchived: false,
  })
  await legacy.close()
}

describe('schema v7 migration (existing client data)', () => {
  it('is version 7', () => {
    expect(SCHEMA_VERSION).toBe(7)
  })

  it('backfills legacy rows with syncState=pending and an updatedAt, non-destructively', async () => {
    await seedLegacyV6()

    // Opening the real (v7) db triggers the upgrade against the legacy data.
    await db.open()

    const acc = await db.accounts.get('a1')
    expect(acc).toBeTruthy()
    // Existing data preserved untouched.
    expect(acc?.name).toBe('نقد')
    expect(acc?.initialBalance).toBe(1000)
    // Queued for first upload.
    expect(acc?.syncState).toBe('pending')
    // An existing updatedAt is kept, not overwritten.
    expect(acc?.updatedAt).toBe('2020-01-01T00:00:00.000Z')

    const cat = await db.categories.get('c1')
    expect(cat?.name).toBe('طعام')
    expect(cat?.syncState).toBe('pending')
    // A missing updatedAt is backfilled.
    expect(cat?.updatedAt).toBeTruthy()
  })

  it('exposes the syncMeta cursor table after upgrade', async () => {
    await seedLegacyV6()
    await db.open()
    await db.syncMeta.put({ table: 'accounts', lastPulledAt: '2026-01-01T00:00:00.000Z' })
    expect((await db.syncMeta.get('accounts'))?.lastPulledAt).toBe('2026-01-01T00:00:00.000Z')
  })
})
