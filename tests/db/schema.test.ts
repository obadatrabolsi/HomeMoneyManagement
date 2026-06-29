import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'

describe('schema', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })
  it('exposes the four tables', () => {
    expect(db.accounts).toBeTruthy()
    expect(db.categories).toBeTruthy()
    expect(db.transactions).toBeTruthy()
    expect(db.settings).toBeTruthy()
  })
  it('round-trips an account', async () => {
    await db.accounts.add({
      id: 'a1', name: 'نقد', icon: 'wallet', color: '#10b981',
      currency: 'EUR', initialBalance: 0, isArchived: false,
      sortOrder: 0, createdAt: 't', updatedAt: 't',
    })
    expect((await db.accounts.get('a1'))?.name).toBe('نقد')
  })
})
