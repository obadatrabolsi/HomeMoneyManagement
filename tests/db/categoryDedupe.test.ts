import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { dedupeCategories, listCategories } from '../../src/db/categoriesRepo'
import { createBudget } from '../../src/db/budgetsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function addCat(id: string, name: string, extra: Record<string, unknown> = {}) {
  await db.categories.add({
    id, name, type: 'expense', icon: 'x', color: '#1',
    sortOrder: 0, isArchived: false, updatedAt: 't', ...extra,
  })
}

describe('dedupeCategories (two devices seeded the same defaults with different ids)', () => {
  it('keeps one category per type+name, re-points references, tombstones the losers', async () => {
    await addCat('zzz', 'طعام')  // e.g. seeded by the phone
    await addCat('aaa', 'طعام')  // e.g. seeded by the browser
    const acc = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const tx = await createTransaction({ type: 'expense', amount: 100, accountId: acc.id, date: '2026-07-01', categoryId: 'zzz' })
    const b = await createBudget({ categoryId: 'zzz', month: '2026-07', amount: 5000, currency: 'EUR' })

    const merged = await dedupeCategories()

    expect(merged).toBe(1)
    const food = (await listCategories()).filter(c => c.name === 'طعام')
    expect(food).toHaveLength(1)
    expect(food[0].id).toBe('aaa') // deterministic winner (smallest id) → both devices agree

    // References follow the survivor, so no data is orphaned.
    expect((await db.transactions.get(tx.id))?.categoryId).toBe('aaa')
    expect((await db.budgets.get(b.id))?.categoryId).toBe('aaa')

    // Loser is a pending tombstone so the de-dup propagates to the other device.
    const loser = await db.categories.get('zzz')
    expect(loser?.deletedAt).toBeTruthy()
    expect(loser?.syncState).toBe('pending')
  })

  it('re-points child categories to the survivor', async () => {
    await addCat('zzz', 'أب')
    await addCat('aaa', 'أب')
    await addCat('child', 'ابن', { parentId: 'zzz' })
    await dedupeCategories()
    expect((await db.categories.get('child'))?.parentId).toBe('aaa')
  })

  it('excludes tombstoned categories from listCategories', async () => {
    await addCat('a', 'نقل')
    await addCat('b', 'نقل', { deletedAt: '2026-07-01T00:00:00.000Z' })
    expect((await listCategories()).filter(c => c.name === 'نقل')).toHaveLength(1)
  })

  it('is idempotent — a converged database is left alone', async () => {
    await addCat('zzz', 'طعام')
    await addCat('aaa', 'طعام')
    await dedupeCategories()
    expect(await dedupeCategories()).toBe(0)
  })
})
