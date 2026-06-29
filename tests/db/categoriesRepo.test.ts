import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import {
  createCategory, listCategories, updateCategory, archiveCategory, seedDefaultCategories,
} from '../../src/db/categoriesRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('categoriesRepo', () => {
  it('creates and lists by type ordered', async () => {
    await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    await createCategory({ name: 'الراتب', type: 'income', icon: 'cash', color: '#0f0' })
    expect((await listCategories('expense')).map(c => c.name)).toEqual(['الطعام'])
    expect((await listCategories('income')).map(c => c.name)).toEqual(['الراتب'])
  })
  it('archives a category so it drops from the list', async () => {
    const c = await createCategory({ name: 'تجربة', type: 'expense', icon: 'x', color: '#1' })
    await archiveCategory(c.id)
    expect(await listCategories('expense')).toHaveLength(0)
  })
  it('updates a category name', async () => {
    const c = await createCategory({ name: 'قديم', type: 'expense', icon: 'x', color: '#1' })
    await updateCategory(c.id, { name: 'جديد' })
    expect((await listCategories('expense'))[0].name).toBe('جديد')
  })
  it('seeds defaults only when empty', async () => {
    await seedDefaultCategories()
    const first = (await listCategories()).length
    expect(first).toBeGreaterThan(0)
    await seedDefaultCategories()
    expect((await listCategories()).length).toBe(first)
  })
})
