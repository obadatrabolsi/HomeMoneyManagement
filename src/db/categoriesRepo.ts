import { db } from './schema'
import { id } from '../lib/uuid'
import type { Category, CategoryType } from './types'

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  let rows = await db.categories.filter(c => !c.isArchived).toArray()
  if (type) rows = rows.filter(c => c.type === type)
  return rows.sort((a, b) => a.sortOrder - b.sortOrder)
}

export async function createCategory(
  input: Omit<Category, 'id' | 'sortOrder' | 'isArchived'> & Partial<Pick<Category, 'sortOrder'>>,
): Promise<Category> {
  const count = await db.categories.count()
  const cat: Category = {
    id: id(),
    sortOrder: input.sortOrder ?? count,
    isArchived: false,
    ...input,
  }
  await db.categories.add(cat)
  return cat
}

export async function updateCategory(catId: string, patch: Partial<Category>): Promise<void> {
  await db.categories.update(catId, patch)
}

export async function archiveCategory(catId: string): Promise<void> {
  await db.categories.update(catId, { isArchived: true })
}

const DEFAULTS: Array<Pick<Category, 'name' | 'type' | 'icon' | 'color'>> = [
  { name: 'الراتب', type: 'income', icon: 'cash', color: '#16a34a' },
  { name: 'العمل الحر', type: 'income', icon: 'laptop', color: '#0d9488' },
  { name: 'الهدايا', type: 'income', icon: 'gift', color: '#7c3aed' },
  { name: 'الطعام', type: 'expense', icon: 'utensils', color: '#ef4444' },
  { name: 'البقالة', type: 'expense', icon: 'cart', color: '#f97316' },
  { name: 'المواصلات', type: 'expense', icon: 'bus', color: '#eab308' },
  { name: 'الإيجار', type: 'expense', icon: 'home', color: '#0ea5e9' },
  { name: 'الخدمات', type: 'expense', icon: 'bolt', color: '#6366f1' },
  { name: 'الترفيه', type: 'expense', icon: 'film', color: '#ec4899' },
  { name: 'الصحة', type: 'expense', icon: 'heart', color: '#14b8a6' },
]

export async function seedDefaultCategories(): Promise<void> {
  if ((await db.categories.count()) > 0) return
  for (let i = 0; i < DEFAULTS.length; i++) {
    await createCategory({ ...DEFAULTS[i], sortOrder: i })
  }
}
