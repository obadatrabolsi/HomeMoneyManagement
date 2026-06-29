import { useLiveQuery } from 'dexie-react-hooks'
import { listCategories, archiveCategory } from '../../db/categoriesRepo'
import { CategoryForm } from './CategoryForm'
import { IconBadge } from '../../components/ui/IconBadge'
import { Icon } from '../../components/ui/Icon'
import { t } from '../../i18n/ar'
import type { CategoryType } from '../../db/types'

function Group({ type, title }: { type: CategoryType; title: string }) {
  const cats = useLiveQuery(() => listCategories(type), [type], [])
  const roots = cats.filter(c => !c.parentId)
  const children = cats.filter(c => c.parentId)

  return (
    <section className="space-y-2">
      <h2 className="font-bold text-ink">{title}</h2>
      {roots.map((c) => (
        <div key={c.id} className="space-y-2">
          <div className="flex items-center justify-between rounded-2xl bg-surface p-3 shadow-soft">
            <div className="flex items-center gap-3">
              <IconBadge icon={c.icon} color={c.color} />
              <div>
                <span className="font-semibold text-ink">{c.name}</span>
                <span className="block text-xs text-muted">{t(type)}</span>
              </div>
            </div>
            <button
              aria-label={t('archive')}
              className="text-muted transition hover:text-expense"
              onClick={() => archiveCategory(c.id)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
          {children.filter(s => s.parentId === c.id).map((sub) => (
            <div key={sub.id} className="mr-4 flex items-center justify-between rounded-2xl border-r-2 border-line bg-surface p-3 shadow-soft">
              <div className="flex items-center gap-3">
                <IconBadge icon={sub.icon} color={sub.color} size="sm" />
                <div>
                  <span className="font-semibold text-ink">{sub.name}</span>
                  <span className="block text-xs text-muted">{t(type)}</span>
                </div>
              </div>
              <button
                aria-label={t('archive')}
                className="text-muted transition hover:text-expense"
                onClick={() => archiveCategory(sub.id)}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          ))}
        </div>
      ))}
      {/* Orphaned sub-categories (parent archived or missing) */}
      {children.filter(s => !roots.find(r => r.id === s.parentId)).map((sub) => (
        <div key={sub.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 shadow-soft">
          <div className="flex items-center gap-3">
            <IconBadge icon={sub.icon} color={sub.color} size="sm" />
            <div>
              <span className="font-semibold text-ink">{sub.name}</span>
              <span className="block text-xs text-muted">{t(type)}</span>
            </div>
          </div>
          <button
            aria-label={t('archive')}
            className="text-muted transition hover:text-expense"
            onClick={() => archiveCategory(sub.id)}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      ))}
      <CategoryForm type={type} onDone={() => {}} />
    </section>
  )
}

export function CategoriesPage() {
  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="text-xl font-bold text-ink">{t('categories')}</h1>
      <Group type="expense" title={t('expense')} />
      <Group type="income" title={t('income')} />
    </div>
  )
}
