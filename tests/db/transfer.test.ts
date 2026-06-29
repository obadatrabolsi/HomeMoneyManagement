import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createTransfer } from '../../src/db/transactionsRepo'
import { createAccount, accountBalance } from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('createTransfer', () => {
  it('creates two linked rows and moves balance', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 10000 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const r = await createTransfer({ fromAccountId: a.id, toAccountId: b.id, amount: 4000, date: '2026-06-01' })
    expect(await accountBalance(a.id)).toBe(6000)
    expect(await accountBalance(b.id)).toBe(4000)
    const group = await db.transactions.where('transferGroupId').equals(r.groupId).toArray()
    expect(group).toHaveLength(2)
  })
  it('rejects same-account transfer', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await expect(createTransfer({ fromAccountId: a.id, toAccountId: a.id, amount: 1, date: '2026-06-01' }))
      .rejects.toThrow('SAME_ACCOUNT')
  })
  it('rejects currency mismatch', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })
    await expect(createTransfer({ fromAccountId: a.id, toAccountId: b.id, amount: 1, date: '2026-06-01' }))
      .rejects.toThrow('CURRENCY_MISMATCH')
  })
})
