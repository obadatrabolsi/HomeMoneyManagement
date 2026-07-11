import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createRule, processDueRules } from '../../src/db/recurringRepo'
import { markSynced } from '../../src/db/syncTracking'

beforeEach(async () => { await db.delete(); await db.open() })

describe('processDueRules — no needless sync churn', () => {
  it('does NOT re-dirty a rule that has nothing due', async () => {
    const acc = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    // Next run is far in the future → nothing due today.
    const r = await createRule({ type: 'expense', amount: 500, accountId: acc.id, frequency: 'monthly', interval: 1, startDate: '2099-01-01' })
    await markSynced('recurringRules', [r.id])
    const before = (await db.recurringRules.get(r.id))!

    const created = await processDueRules('2026-07-11')

    expect(created).toBe(0)
    const after = (await db.recurringRules.get(r.id))!
    expect(after.syncState).toBe('synced')          // must NOT be flipped back to pending
    expect(after.updatedAt).toBe(before.updatedAt)  // LWW clock must not be bumped
  })

  it('still advances and dirties a rule that actually runs', async () => {
    const acc = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const r = await createRule({ type: 'expense', amount: 500, accountId: acc.id, frequency: 'daily', interval: 1, startDate: '2026-07-10' })
    await markSynced('recurringRules', [r.id])

    const created = await processDueRules('2026-07-11')

    expect(created).toBeGreaterThan(0)
    expect((await db.recurringRules.get(r.id))?.syncState).toBe('pending') // legitimately changed
  })
})
