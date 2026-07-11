import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { seedDefaultCategories, dedupeCategories, listCategories } from '../../src/db/categoriesRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('deterministic ids for default categories', () => {
  it('seeds the same stable ids on every device', async () => {
    await seedDefaultCategories()
    const first = (await listCategories()).map(c => `${c.id}|${c.name}`).sort()
    expect(first.some(s => s.startsWith('def_salary|'))).toBe(true)
    expect(first.some(s => s.startsWith('def_groceries|'))).toBe(true)

    // A second, independent device seeding from scratch must produce identical ids.
    await db.delete(); await db.open()
    await seedDefaultCategories()
    const second = (await listCategories()).map(c => `${c.id}|${c.name}`).sort()
    expect(second).toEqual(first)
  })

  it('migrates a legacy random-id default onto the deterministic id, re-pointing references', async () => {
    // A pre-existing install: the default was seeded with a random UUID.
    // Its id sorts BEFORE "def_", so only a deterministic-preference rule picks the new one.
    await db.categories.add({
      id: 'aaa-legacy', name: 'البقالة', type: 'expense', icon: '🛒', color: '#f97316',
      sortOrder: 0, isArchived: false, updatedAt: 't',
    })
    const acc = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const tx = await createTransaction({ type: 'expense', amount: 100, accountId: acc.id, date: '2026-07-01', categoryId: 'aaa-legacy' })

    await seedDefaultCategories()
    await dedupeCategories()

    const groceries = (await listCategories()).filter(c => c.name === 'البقالة')
    expect(groceries).toHaveLength(1)
    expect(groceries[0].id).toBe('def_groceries')                       // adopted the stable id
    expect((await db.transactions.get(tx.id))?.categoryId).toBe('def_groceries') // reference followed
    expect((await db.categories.get('aaa-legacy'))?.deletedAt).toBeTruthy()      // legacy tombstoned
  })

  it('does not resurrect a deterministic default the user deleted', async () => {
    await seedDefaultCategories()
    await db.categories.update('def_groceries', { deletedAt: '2026-07-01T00:00:00.000Z' })

    await seedDefaultCategories()

    expect((await listCategories()).some(c => c.id === 'def_groceries')).toBe(false)
  })

  it('does not resurrect a legacy default the user deleted', async () => {
    // Only a tombstoned copy of this default exists — the user removed it.
    await db.categories.add({
      id: 'aaa-legacy', name: 'البقالة', type: 'expense', icon: '🛒', color: '#f97316',
      sortOrder: 0, isArchived: false, updatedAt: 't', deletedAt: '2026-07-01T00:00:00.000Z',
    })

    await seedDefaultCategories()

    expect((await listCategories()).some(c => c.name === 'البقالة')).toBe(false)
  })
})
