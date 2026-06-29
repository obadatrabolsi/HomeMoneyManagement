import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { budgetProgress, deleteBudget } from '../../db/budgetsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { isoMonth } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { BudgetBar } from './BudgetBar'
import { BudgetForm } from './BudgetForm'
import { Button } from '../../components/ui/Button'
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('budgets')}</h1>
        <Button onClick={() => setOpen(true)}>{t('addBudget')}</Button>
      </div>
      {data.length === 0 && <EmptyState message={t('noData')} />}
      {data.map((p) => (
        <div key={p.budget.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="font-medium">{p.categoryName}</span>
            <button aria-label={t('delete')} onClick={() => deleteBudget(p.budget.id)}>🗑</button>
          </div>
          <BudgetBar percent={p.percent} status={p.status} />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('spent')}: {formatMoney(p.spent, p.budget.currency)} / {formatMoney(p.budget.amount, p.budget.currency)}</span>
            <span className={p.status === 'over' ? 'text-red-600' : ''}>{t('remaining')}: {formatMoney(p.remaining, p.budget.currency)} ({p.percent}%)</span>
          </div>
        </div>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <BudgetForm month={month} onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
