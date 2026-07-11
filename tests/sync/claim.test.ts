import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { markSynced } from '../../src/db/syncTracking'
import { claimLocalDataForUser } from '../../src/sync/claim'

beforeEach(async () => { await db.delete(); await db.open() })

describe('claimLocalDataForUser (existing data on first login)', () => {
  it('stamps existing rows with userId and queues them pending, preserving updatedAt', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await markSynced('accounts', [a.id])
    const before = (await db.accounts.get(a.id))!.updatedAt

    const claimed = await claimLocalDataForUser('user-123')

    expect(claimed).toBeGreaterThanOrEqual(1)
    const row = await db.accounts.get(a.id)
    expect(row?.userId).toBe('user-123')     // now owned by the signed-in user
    expect(row?.syncState).toBe('pending')   // re-queued for its first upload
    expect(row?.updatedAt).toBe(before)      // content/version untouched (non-destructive)
  })

  it('is idempotent — does not re-claim rows already owned and synced', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await claimLocalDataForUser('user-123')
    await markSynced('accounts', [a.id])
    const second = await claimLocalDataForUser('user-123')
    expect(second).toBe(0)
  })
})
