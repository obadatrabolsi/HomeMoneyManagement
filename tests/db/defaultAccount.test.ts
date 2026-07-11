import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import {
  createAccount,
  archiveAccount,
  getDefaultAccountId,
  setDefaultAccount,
  resolveDefaultAccountId,
} from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('default account', () => {
  it('marks the first created account as default automatically', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    expect(await getDefaultAccountId()).toBe(a.id)
  })

  it('does not override an existing default when more accounts are created', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    expect(await getDefaultAccountId()).toBe(a.id)
  })

  it('lets you set a different default explicitly', async () => {
    await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await setDefaultAccount(b.id)
    expect(await getDefaultAccountId()).toBe(b.id)
  })

  it('reassigns the default to a remaining account when the default is archived', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    expect(await getDefaultAccountId()).toBe(a.id)
    await archiveAccount(a.id)
    expect(await getDefaultAccountId()).toBe(b.id)
  })

  it('resolveDefaultAccountId falls back to the first account when stored default is stale', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await setDefaultAccount('does-not-exist')
    expect(await resolveDefaultAccountId()).toBe(a.id)
  })

  it('resolveDefaultAccountId returns undefined when there are no accounts', async () => {
    expect(await resolveDefaultAccountId()).toBeUndefined()
  })
})
