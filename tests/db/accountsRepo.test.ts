import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount, listAccounts, accountBalance, archiveAccount, totalsByCurrency } from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function addTx(partial: any) {
  await db.transactions.add({
    id: crypto.randomUUID(), tags: [], date: '2026-06-01',
    createdAt: 't', updatedAt: 't', ...partial,
  })
}

describe('accountsRepo', () => {
  it('creates with initial balance and computes balance from transactions', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 10000 })
    await addTx({ type: 'income', amount: 5000, accountId: a.id })
    await addTx({ type: 'expense', amount: 2000, accountId: a.id })
    expect(await accountBalance(a.id)).toBe(13000)
  })
  it('ignores soft-deleted transactions in balance', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await addTx({ type: 'income', amount: 5000, accountId: a.id, deletedAt: 't' })
    expect(await accountBalance(a.id)).toBe(0)
  })
  it('handles transfer direction in balance', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await addTx({ type: 'transfer', transferDirection: 'in', amount: 3000, accountId: a.id })
    await addTx({ type: 'transfer', transferDirection: 'out', amount: 1000, accountId: a.id })
    expect(await accountBalance(a.id)).toBe(2000)
  })
  it('groups totals by currency', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 1000 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 500 })
    const c = await createAccount({ name: 'C', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 250 })
    expect(await totalsByCurrency()).toEqual({ EUR: 1250, USD: 500 })
  })
  it('archives account so it drops from default list', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await archiveAccount(a.id)
    expect(await listAccounts()).toHaveLength(0)
    expect(await listAccounts(true)).toHaveLength(1)
  })
})
