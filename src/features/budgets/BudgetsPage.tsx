import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { budgetProgress, deleteBudget } from '../../db/budgetsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { isoMonth } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { BudgetBar } from './BudgetBar'
import { BudgetForm } from './BudgetForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function BudgetsPage() {
  const month = isoMonth(new Date())
  const [open, setOpen] = useState(false)
  const data = useLiveQuery(async () => {
    const progress = await budgetProgress(month)
    const cats = await listCategories('expense')
    const name = (id: string) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    return progress.map((p) => ({ ...p, categoryName: name(p.budget.categoryId) }))
  }, [month], [])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('budgets')}</h1>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          {t('addBudget')}
        </Button>
      </div>
      {data.length === 0 && <EmptyState message={t('noData')} emoji="📊" />}
      {data.map((p) => (
        <div key={p.budget.id} className="space-y-2 rounded-3xl bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ink">{p.categoryName}</span>
            <button
              aria-label={t('delete')}
              className="text-muted transition hover:text-expense"
              onClick={async () => { if (window.confirm('حذف هذه الميزانية؟')) await deleteBudget(p.budget.id) }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
          <BudgetBar percent={p.percent} status={p.status} />
          <div className="flex justify-between text-xs text-muted">
            <span className="tabular-nums">{t('spent')}: {formatMoney(p.spent, p.budget.currency)} / {formatMoney(p.budget.amount, p.budget.currency)}</span>
            <span className={`tabular-nums ${p.status === 'over' ? 'text-expense' : ''}`}>{t('remaining')}: {formatMoney(p.remaining, p.budget.currency)} ({p.percent}%)</span>
          </div>
        </div>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <BudgetForm month={month} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
