import { db } from './schema'
import { id } from '../lib/uuid'
import type { Category, CategoryType } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export async function listCategories(type?: CategoryType): Promise<Category[]> {
  let rows = await db.categories.filter(c => !c.isArchived && !c.deletedAt).toArray()
  if (type) rows = rows.filter(c => c.type === type)
  return rows.sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Fold duplicate categories (same type+name) into a single survivor.
 *
 * Default categories are seeded locally on each device with fresh random UUIDs,
 * so two devices seed the *same* categories under *different* ids — and sync,
 * which matches on id, then treats them as distinct rows and duplicates them.
 *
 * The survivor is the lexicographically smallest id in the group: a choice every
 * device computes identically once it has synced, so all devices converge on the
 * same winner without coordination. References are re-pointed to the survivor and
 * the losers become tombstones, so the merge itself propagates. Idempotent.
 *
 * Returns how many duplicate rows were merged away.
 */
export async function dedupeCategories(): Promise<number> {
  const live = (await db.categories.toArray()).filter(c => !c.deletedAt)

  const groups = new Map<string, Category[]>()
  for (const c of live) {
    const key = `${c.type}:${c.name}`
    const group = groups.get(key) ?? []
    group.push(c)
    groups.set(key, group)
  }

  let merged = 0
  const stamp = nowIso()
  for (const group of groups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => a.id.localeCompare(b.id))
    // Prefer the built-in deterministic id, so a legacy random-id copy is migrated
    // onto the stable id rather than the other way round. Otherwise fall back to the
    // smallest id. Both rules are pure functions of the group, so every device agrees.
    const survivorId = (group.find(c => DEFAULT_IDS.has(c.id)) ?? group[0]).id
    const loserIds = group.filter(c => c.id !== survivorId).map(c => c.id)

    // Re-point every reference so no transaction/budget/rule is orphaned.
    await db.transactions.where('categoryId').anyOf(loserIds).modify({ categoryId: survivorId })
    await db.budgets.where('categoryId').anyOf(loserIds).modify({ categoryId: survivorId })
    await db.categories.where('parentId').anyOf(loserIds).modify({ parentId: survivorId })
    // recurringRules.categoryId isn't indexed — scan this small table instead.
    await db.recurringRules
      .filter(r => !!r.categoryId && loserIds.includes(r.categoryId))
      .modify({ categoryId: survivorId })

    // Tombstone the losers so the de-duplication syncs to the other devices.
    await db.categories.where('id').anyOf(loserIds).modify({ deletedAt: stamp })
    merged += loserIds.length
  }
  return merged
}

export async function getCategory(catId: string): Promise<Category | undefined> {
  return db.categories.get(catId)
}

export async function createCategory(
  input: Omit<Category, 'id' | 'sortOrder' | 'isArchived' | 'updatedAt'> & Partial<Pick<Category, 'sortOrder' | 'id'>>,
): Promise<Category> {
  const count = await db.categories.count()
  const cat: Category = {
    ...input,
    id: input.id ?? id(),
    sortOrder: input.sortOrder ?? count,
    isArchived: false,
    updatedAt: nowIso(),
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

/**
 * A default category's identity is its `key` — a stable slug, NOT its display
 * name. Renaming an Arabic label later must not change the row's identity.
 */
type DefaultCategory = Pick<Category, 'name' | 'type' | 'icon' | 'color'> & { key: string }

/**
 * The id every device derives for a given default. Because it is a pure function
 * of the stable key, two devices seeding the same default produce the SAME id, so
 * sync (which matches on id) converges them instead of duplicating them.
 */
export function defaultCategoryId(key: string): string {
  return `def_${key}`
}

const DEFAULTS: DefaultCategory[] = [
  // ── الدخل ──
  { key: 'salary', name: 'الراتب', type: 'income', icon: '💰', color: '#16a34a' },
  { key: 'freelance', name: 'العمل الحر', type: 'income', icon: '💻', color: '#0d9488' },
  { key: 'bonus', name: 'مكافآت وحوافز', type: 'income', icon: '🏅', color: '#f59e0b' },
  { key: 'investment', name: 'استثمار', type: 'income', icon: '📈', color: '#10b981' },
  { key: 'rental_income', name: 'دخل عقاري', type: 'income', icon: '🏘️', color: '#0ea5e9' },
  { key: 'refund', name: 'استرداد', type: 'income', icon: '🔁', color: '#22c55e' },
  { key: 'sales', name: 'مبيعات', type: 'income', icon: '🛍️', color: '#8b5cf6' },
  { key: 'gifts_in', name: 'الهدايا', type: 'income', icon: '🎁', color: '#7c3aed' },
  { key: 'other_income', name: 'دخل آخر', type: 'income', icon: '➕', color: '#64748b' },

  // ── المصروفات ──
  { key: 'dining', name: 'الطعام والمطاعم', type: 'expense', icon: '🍔', color: '#ef4444' },
  { key: 'groceries', name: 'البقالة', type: 'expense', icon: '🛒', color: '#f97316' },
  { key: 'coffee', name: 'المقاهي والقهوة', type: 'expense', icon: '☕', color: '#a16207' },
  { key: 'transport', name: 'المواصلات', type: 'expense', icon: '🚌', color: '#eab308' },
  { key: 'fuel', name: 'الوقود', type: 'expense', icon: '⛽', color: '#dc2626' },
  { key: 'car', name: 'السيارة والصيانة', type: 'expense', icon: '🚗', color: '#475569' },
  { key: 'rent', name: 'الإيجار', type: 'expense', icon: '🏠', color: '#0ea5e9' },
  { key: 'utilities', name: 'فواتير الخدمات', type: 'expense', icon: '💡', color: '#6366f1' },
  { key: 'internet', name: 'الإنترنت والاتصالات', type: 'expense', icon: '📶', color: '#0891b2' },
  { key: 'subscriptions', name: 'الاشتراكات', type: 'expense', icon: '🔁', color: '#7c3aed' },
  { key: 'health', name: 'الصحة والدواء', type: 'expense', icon: '💊', color: '#14b8a6' },
  { key: 'education', name: 'التعليم', type: 'expense', icon: '🎓', color: '#2563eb' },
  { key: 'entertainment', name: 'الترفيه', type: 'expense', icon: '🎬', color: '#ec4899' },
  { key: 'shopping', name: 'التسوق والملابس', type: 'expense', icon: '👕', color: '#db2777' },
  { key: 'beauty', name: 'العناية والجمال', type: 'expense', icon: '💇', color: '#e11d48' },
  { key: 'fitness', name: 'الرياضة واللياقة', type: 'expense', icon: '🏋️', color: '#16a34a' },
  { key: 'travel', name: 'السفر والسياحة', type: 'expense', icon: '✈️', color: '#0284c7' },
  { key: 'kids', name: 'الأطفال', type: 'expense', icon: '🧸', color: '#f59e0b' },
  { key: 'pets', name: 'الحيوانات الأليفة', type: 'expense', icon: '🐾', color: '#92400e' },
  { key: 'home', name: 'المنزل والأثاث', type: 'expense', icon: '🛋️', color: '#9333ea' },
  { key: 'gifts_out', name: 'الهدايا والمناسبات', type: 'expense', icon: '🎉', color: '#d946ef' },
  { key: 'charity', name: 'التبرعات والصدقات', type: 'expense', icon: '🤲', color: '#059669' },
  { key: 'insurance', name: 'التأمين', type: 'expense', icon: '🛡️', color: '#1d4ed8' },
  { key: 'taxes', name: 'الضرائب والرسوم', type: 'expense', icon: '🧾', color: '#64748b' },
  { key: 'loans', name: 'القروض والأقساط', type: 'expense', icon: '🏦', color: '#b91c1c' },
  { key: 'other_expense', name: 'مصروف آخر', type: 'expense', icon: '📦', color: '#6b7280' },
]

/** Ids of all built-in defaults — the preferred survivor when de-duplicating. */
const DEFAULT_IDS = new Set(DEFAULTS.map(d => defaultCategoryId(d.key)))

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

  // Seed each default under its deterministic id, so every device produces the
  // same row and sync converges instead of duplicating.
  let order = existing.length
  for (const def of DEFAULTS) {
    const detId = defaultCategoryId(def.key)

    // Already have the canonical row — including as a tombstone, so a default the
    // user deleted is never resurrected.
    if (existing.some(c => c.id === detId)) continue

    // A pre-deterministic install seeded this default under a random id. Only adopt
    // the stable id if that legacy copy is still live: if the user deleted it (only
    // tombstones remain), respect that and don't bring it back.
    const sameName = existing.filter(c => c.type === def.type && c.name === def.name)
    if (sameName.length > 0 && sameName.every(c => c.deletedAt)) continue

    await createCategory({
      id: detId,
      name: def.name,
      type: def.type,
      icon: def.icon,
      color: def.color,
      sortOrder: order++,
    })
    // Any live legacy copy is folded into this row by dedupeCategories(), which
    // prefers the deterministic id as the survivor and re-points references to it.
  }
}
