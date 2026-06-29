import { useLiveQuery } from 'dexie-react-hooks'
import { listCategories, archiveCategory } from '../../db/categoriesRepo'
import { CategoryForm } from './CategoryForm'
import { t } from '../../i18n/ar'
import type { CategoryType } from '../../db/types'

function Group({ type, title }: { type: CategoryType; title: string }) {
  const cats = useLiveQuery(() => listCategories(type), [type], [])
  return (
    <section className="space-y-2">
      <h2 className="font-bold">{title}</h2>
      {cats.map((c) => (
        <div key={c.id} className="flex items-center justify-between rounded-lg bg-white p-2 dark:bg-gray-900">
          <span style={{ color: c.color }}>{c.name}</span>
          <button aria-label={t('archive')} onClick={() => archiveCategory(c.id)}>🗑</button>
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
