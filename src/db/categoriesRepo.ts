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
  // ── الدخل ──
  { name: 'الراتب', type: 'income', icon: '💰', color: '#16a34a' },
  { name: 'العمل الحر', type: 'income', icon: '💻', color: '#0d9488' },
  { name: 'مكافآت وحوافز', type: 'income', icon: '🏅', color: '#f59e0b' },
  { name: 'استثمار', type: 'income', icon: '📈', color: '#10b981' },
  { name: 'دخل عقاري', type: 'income', icon: '🏘️', color: '#0ea5e9' },
  { name: 'استرداد', type: 'income', icon: '🔁', color: '#22c55e' },
  { name: 'مبيعات', type: 'income', icon: '🛍️', color: '#8b5cf6' },
  { name: 'الهدايا', type: 'income', icon: '🎁', color: '#7c3aed' },
  { name: 'دخل آخر', type: 'income', icon: '➕', color: '#64748b' },

  // ── المصروفات ──
  { name: 'الطعام والمطاعم', type: 'expense', icon: '🍔', color: '#ef4444' },
  { name: 'البقالة', type: 'expense', icon: '🛒', color: '#f97316' },
  { name: 'المقاهي والقهوة', type: 'expense', icon: '☕', color: '#a16207' },
  { name: 'المواصلات', type: 'expense', icon: '🚌', color: '#eab308' },
  { name: 'الوقود', type: 'expense', icon: '⛽', color: '#dc2626' },
  { name: 'السيارة والصيانة', type: 'expense', icon: '🚗', color: '#475569' },
  { name: 'الإيجار', type: 'expense', icon: '🏠', color: '#0ea5e9' },
  { name: 'فواتير الخدمات', type: 'expense', icon: '💡', color: '#6366f1' },
  { name: 'الإنترنت والاتصالات', type: 'expense', icon: '📶', color: '#0891b2' },
  { name: 'الاشتراكات', type: 'expense', icon: '🔁', color: '#7c3aed' },
  { name: 'الصحة والدواء', type: 'expense', icon: '💊', color: '#14b8a6' },
  { name: 'التعليم', type: 'expense', icon: '🎓', color: '#2563eb' },
  { name: 'الترفيه', type: 'expense', icon: '🎬', color: '#ec4899' },
  { name: 'التسوق والملابس', type: 'expense', icon: '👕', color: '#db2777' },
  { name: 'العناية والجمال', type: 'expense', icon: '💇', color: '#e11d48' },
  { name: 'الرياضة واللياقة', type: 'expense', icon: '🏋️', color: '#16a34a' },
  { name: 'السفر والسياحة', type: 'expense', icon: '✈️', color: '#0284c7' },
  { name: 'الأطفال', type: 'expense', icon: '🧸', color: '#f59e0b' },
  { name: 'الحيوانات الأليفة', type: 'expense', icon: '🐾', color: '#92400e' },
  { name: 'المنزل والأثاث', type: 'expense', icon: '🛋️', color: '#9333ea' },
  { name: 'الهدايا والمناسبات', type: 'expense', icon: '🎉', color: '#d946ef' },
  { name: 'التبرعات والصدقات', type: 'expense', icon: '🤲', color: '#059669' },
  { name: 'التأمين', type: 'expense', icon: '🛡️', color: '#1d4ed8' },
  { name: 'الضرائب والرسوم', type: 'expense', icon: '🧾', color: '#64748b' },
  { name: 'القروض والأقساط', type: 'expense', icon: '🏦', color: '#b91c1c' },
  { name: 'مصروف آخر', type: 'expense', icon: '📦', color: '#6b7280' },
]

// Older builds stored icon names as text tokens (e.g. "cash"); the UI now
// renders the icon glyph directly, so map any legacy token to an emoji.
const LEGACY_ICON_MAP: Record<string, string> = {
  cash: '💰', laptop: '💻', gift: '🎁', utensils: '🍔', cart: '🛒',
  bus: '🚌', home: '🏠', bolt: '💡', film: '🎬', heart: '💊', tag: '🏷️',
}

export async function seedDefaultCategories(): Promise<void> {
  const existing = await db.categories.toArray()

  // Migrate legacy text-token icons to emojis (safe: only touches known tokens).
  for (const c of existing) {
    const mapped = LEGACY_ICON_MAP[c.icon]
    if (mapped) await db.categories.update(c.id, { icon: mapped })
  }

  // Additively seed any default category that doesn't already exist (by type+name),
  // so existing installs gain the newer categories too. Archived defaults are left alone.
  const present = new Set(existing.map((c) => `${c.type}:${c.name}`))
  let order = existing.length
  for (const def of DEFAULTS) {
    if (present.has(`${def.type}:${def.name}`)) continue
    await createCategory({ ...def, sortOrder: order++ })
  }
}
