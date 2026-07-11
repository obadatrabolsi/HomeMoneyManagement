import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { markSynced, listPending, pendingCount } from '../../src/db/syncTracking'

beforeEach(async () => { await db.delete(); await db.open() })

describe('sync tracking', () => {
  it('stamps newly created records as pending with an updatedAt', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const row = await db.accounts.get(a.id)
    expect(row?.syncState).toBe('pending')
    expect(row?.updatedAt).toBeTruthy()
  })

  it('re-marks a record pending when it is updated after syncing', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await markSynced('accounts', [a.id])
    expect((await db.accounts.get(a.id))?.syncState).toBe('synced')
    await db.accounts.update(a.id, { name: 'محفظة' })
    expect((await db.accounts.get(a.id))?.syncState).toBe('pending')
  })

  it('markSynced flips state to synced without bumping updatedAt', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const before = (await db.accounts.get(a.id))!.updatedAt
    await markSynced('accounts', [a.id])
    const after = (await db.accounts.get(a.id))!
    expect(after.syncState).toBe('synced')
    expect(after.updatedAt).toBe(before)
  })

  it('listPending / pendingCount aggregate unsynced rows across tables', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createTransaction({ type: 'expense', amount: 500, accountId: a.id, date: '2026-07-01' })
    await markSynced('accounts', [a.id]) // account synced; transaction still pending
    const pending = await listPending()
    const tables = pending.map(p => p.table)
    expect(tables).toContain('transactions')
    expect(tables).not.toContain('accounts')
    expect(await pendingCount()).toBe(1)
  })
})
