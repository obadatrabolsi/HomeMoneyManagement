import { useLiveQuery } from 'dexie-react-hooks'
import { listCategories, archiveCategory } from '../../db/categoriesRepo'
import { CategoryForm } from './CategoryForm'
import { t } from '../../i18n/ar'
import type { CategoryType } from '../../db/types'

function Group({ type, title }: { type: CategoryType; title: string }) {
  const cats = useLiveQuery(() => listCategories(type), [type], [])
  const roots = cats.filter(c => !c.parentId)
  const children = cats.filter(c => c.parentId)

  return (
    <section className="space-y-2">
      <h2 className="font-bold">{title}</h2>
      {roots.map((c) => (
        <div key={c.id}>
          <div className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-gray-900">
            <span style={{ color: c.color }}>{c.name}</span>
            <button aria-label={t('archive')} onClick={() => archiveCategory(c.id)}>🗑</button>
          </div>
          {children.filter(s => s.parentId === c.id).map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-lg bg-white p-2 pr-6 dark:bg-gray-900 mr-4 border-r-2 border-gray-200">
              <span style={{ color: sub.color }}>↳ {sub.name}</span>
              <button aria-label={t('archive')} onClick={() => archiveCategory(sub.id)}>🗑</button>
            </div>
          ))}
        </div>
      ))}
      {/* Orphaned sub-categories (parent archived or missing) */}
      {children.filter(s => !roots.find(r => r.id === s.parentId)).map((sub) => (
        <div key={sub.id} className="flex items-center justify-between rounded-lg bg-white p-2 pr-6 dark:bg-gray-900">
          <span style={{ color: sub.color }}>↳ {sub.name}</span>
          <button aria-label={t('archive')} onClick={() => archiveCategory(sub.id)}>🗑</button>
        </div>
      ))}
      <CategoryForm type={type} onDone={() => {}} />
    </section>
  )
}

export function CategoriesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('categories')}</h1>
      <Group type="expense" title={t('expense')} />
      <Group type="income" title={t('income')} />
    </div>
  )
}
