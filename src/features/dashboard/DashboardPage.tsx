import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { totalsByCurrency, listAccounts } from '../../db/accountsRepo'
import { dayTotalsByCurrency, rangeTotalsByCurrency, categoryBreakdown, recentTransactions } from '../../db/transactionsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { budgetProgress } from '../../db/budgetsRepo'
import { isoDate, monthRange, isoMonth } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { CategoryPie } from './CategoryPie'
import { BudgetBar } from '../budgets/BudgetBar'
import { TransactionRow } from '../transactions/TransactionRow'
import { t } from '../../i18n/ar'

export function DashboardPage() {
  const data = useLiveQuery(async () => {
    const now = new Date()
    const today = isoDate(now)
    const month = monthRange(now)
    const totals = await totalsByCurrency()
    const dayByCur = await dayTotalsByCurrency(today)
    const monthByCur = await rangeTotalsByCurrency(month.start, month.end)
    const breakdown = await categoryBreakdown(month.start, month.end)
    const cats = await listCategories('expense')
    const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    const pie = breakdown.map((b) => ({ name: catName(b.categoryId), value: b.total / 100 }))
    const budgets = (await budgetProgress(isoMonth(now))).slice(0, 3).map(p => ({ ...p, categoryName: catName(p.budget.categoryId) }))
    const recent = await recentTransactions(5)
    const accounts = await listAccounts()
    const accCur: Record<string, string> = {}
    for (const a of accounts) accCur[a.id] = a.currency
    return { totals, dayByCur, monthByCur, pie, budgets, recent, accCur }
  }, [], undefined)

  if (!data) return null
  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h1 className="text-sm text-gray-500">{t('totalBalance')}</h1>
        {Object.entries(data.totals).map(([cur, amt]) => (
          <p key={cur} className="text-2xl font-bold tabular-nums">{formatMoney(amt, cur)}</p>
        ))}
        {Object.keys(data.totals).length === 0 && <p className="text-gray-400">{t('noData')}</p>}
      </section>
      <div className="space-y-3">
        {Object.entries(data.dayByCur).map(([cur, totals]) => (
          <div key={cur} className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
              <p className="text-xs text-gray-500">{t('todayIncome')} ({cur})</p>
              <p className="text-emerald-600">{formatMoney(totals.income, cur)}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
              <p className="text-xs text-gray-500">{t('todayExpense')} ({cur})</p>
              <p className="text-red-600">{formatMoney(totals.expense, cur)}</p>
            </div>
          </div>
        ))}
        {Object.keys(data.dayByCur).length === 0 && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
              <p className="text-xs text-gray-500">{t('todayIncome')}</p>
              <p className="text-emerald-600 text-gray-400">{t('noData')}</p>
            </div>
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
              <p className="text-xs text-gray-500">{t('todayExpense')}</p>
              <p className="text-red-600 text-gray-400">{t('noData')}</p>
            </div>
          </div>
        )}
      </div>
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h2 className="mb-2 text-sm text-gray-500">{t('monthSummary')}</h2>
        {Object.entries(data.monthByCur).map(([cur, totals]) => {
          const net = totals.income - totals.expense
          return (
            <div key={cur} className="mb-3 space-y-1">
              <p className="text-xs font-semibold text-gray-400">{cur}</p>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">{t('income')}</span>
                <span className="text-emerald-600 tabular-nums">{formatMoney(totals.income, cur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">{t('expense')}</span>
                <span className="text-red-600 tabular-nums">{formatMoney(totals.expense, cur)}</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-xs text-gray-500">{t('net')}</span>
                <span className={`tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoney(net, cur)}</span>
              </div>
            </div>
          )
        })}
        {Object.keys(data.monthByCur).length === 0 && <p className="text-gray-400">{t('noData')}</p>}
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h2 className="mb-2 text-sm text-gray-500">{t('expenseDistribution')}</h2>
        <CategoryPie data={data.pie} />
      </section>
      {data.budgets.length > 0 && (
        <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm text-gray-500">{t('budgetProgress')}</h2>
            <Link to="/budgets" className="text-xs text-emerald-600">{t('viewAll')}</Link>
          </div>
          {data.budgets.map((p) => (
            <div key={p.budget.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>{p.categoryName}</span>
                <span className={p.status === 'over' ? 'text-red-600' : 'text-gray-500'}>{p.percent}%</span>
              </div>
              <BudgetBar percent={p.percent} status={p.status} />
            </div>
          ))}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-sm text-gray-500">{t('recent')}</h2>
        {data.recent.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={data.accCur[tx.accountId] ?? 'EUR'} />)}
      </section>
    </div>
  )
}
