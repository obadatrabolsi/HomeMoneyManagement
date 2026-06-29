import { useLiveQuery } from 'dexie-react-hooks'
import { totalsByCurrency } from '../../db/accountsRepo'
import { dayTotals, rangeTotals, categoryBreakdown, recentTransactions } from '../../db/transactionsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { isoDate, monthRange } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { CategoryPie } from './CategoryPie'
import { TransactionRow } from '../transactions/TransactionRow'
import { t } from '../../i18n/ar'

export function DashboardPage() {
  const data = useLiveQuery(async () => {
    const now = new Date()
    const today = isoDate(now)
    const month = monthRange(now)
    const totals = await totalsByCurrency()
    const day = await dayTotals(today)
    const monthTotals = await rangeTotals(month.start, month.end)
    const breakdown = await categoryBreakdown(month.start, month.end)
    const cats = await listCategories('expense')
    const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    const pie = breakdown.map((b) => ({ name: catName(b.categoryId), value: b.total / 100 }))
    const recent = await recentTransactions(5)
    return { totals, day, monthTotals, pie, recent }
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
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <p className="text-xs text-gray-500">{t('todayIncome')}</p>
          <p className="text-emerald-600">{formatMoney(data.day.income, 'EUR')}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <p className="text-xs text-gray-500">{t('todayExpense')}</p>
          <p className="text-red-600">{formatMoney(data.day.expense, 'EUR')}</p>
        </div>
      </div>
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h2 className="mb-2 text-sm text-gray-500">{t('monthSummary')}</h2>
        <CategoryPie data={data.pie} />
      </section>
      <section className="space-y-2">
        <h2 className="text-sm text-gray-500">{t('recent')}</h2>
        {data.recent.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
      </section>
    </div>
  )
}
