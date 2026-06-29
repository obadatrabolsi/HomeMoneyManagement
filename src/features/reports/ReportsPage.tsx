import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../db/reportsRepo'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { db } from '../../db/schema'
import { monthRange } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { CategoryPie } from '../dashboard/CategoryPie'
import { MonthlyBar } from './MonthlyBar'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

type PeriodKey = 'thisMonth' | 'lastMonth' | 'thisYear'

function periodRange(key: PeriodKey): { from: string; to: string; year: number } {
  const now = new Date()
  const year = now.getFullYear()
  if (key === 'thisYear') return { from: `${year}-01-01`, to: `${year}-12-31`, year }
  if (key === 'lastMonth') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const r = monthRange(d)
    return { from: r.start, to: r.end, year: d.getFullYear() }
  }
  const r = monthRange(now)
  return { from: r.start, to: r.end, year }
}

export function ReportsPage() {
  const [currency, setCurrency] = useState('')
  const [period, setPeriod] = useState<PeriodKey>('thisMonth')

  const data = useLiveQuery(async () => {
    const settings = await db.settings.get('singleton')
    const accounts = await listAccounts(true)
    const currencies = [...new Set(accounts.map((a) => a.currency))]
    const cur = currency || settings?.defaultCurrency || currencies[0] || 'EUR'
    const { from, to, year } = periodRange(period)
    const totals = await incomeExpenseTotals(from, to, cur)
    const cats = await listCategories('expense')
    const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    const spending = await categorySpending(from, to, cur)
    const pie = spending.map((s) => ({ name: catName(s.categoryId), value: s.total / 100 }))
    const monthly = await monthlyTotals(year, cur)
    const stats = await statistics(from, to, cur)
    const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'
    return { cur, currencies, totals, pie, monthly, stats, catName, accName }
  }, [currency, period], undefined)

  if (!data) return null
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('reports')}</h1>
      <div className="flex gap-2">
        <Field label={t('currency')}>
          <select className="w-full rounded-lg border p-2" value={data.cur} onChange={(e) => setCurrency(e.target.value)}>
            {data.currencies.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label={t('period')}>
          <select className="w-full rounded-lg border p-2" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)}>
            <option value="thisMonth">{t('thisMonth')}</option>
            <option value="lastMonth">{t('lastMonth')}</option>
            <option value="thisYear">{t('thisYear')}</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <p className="text-xs text-gray-500">{t('income')}</p>
          <p className="text-emerald-600">{formatMoney(data.totals.income, data.cur)}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <p className="text-xs text-gray-500">{t('expense')}</p>
          <p className="text-red-600">{formatMoney(data.totals.expense, data.cur)}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
          <p className="text-xs text-gray-500">{t('net')}</p>
          <p className={data.totals.net < 0 ? 'text-red-600' : 'text-emerald-600'}>{formatMoney(data.totals.net, data.cur)}</p>
        </div>
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h2 className="mb-2 text-sm text-gray-500">{t('monthlyReport')}</h2>
        <MonthlyBar data={data.monthly} />
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h2 className="mb-2 text-sm text-gray-500">{t('topCategory')}</h2>
        <CategoryPie data={data.pie} />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <Stat label={t('largestExpense')} value={data.stats.largestExpense ? formatMoney(data.stats.largestExpense.amount, data.cur) : '—'} />
        <Stat label={t('largestIncome')} value={data.stats.largestIncome ? formatMoney(data.stats.largestIncome.amount, data.cur) : '—'} />
        <Stat label={t('avgDailyExpense')} value={formatMoney(data.stats.avgDailyExpense, data.cur)} />
        <Stat label={t('topCategory')} value={data.stats.topCategoryId ? data.catName(data.stats.topCategoryId) : '—'} />
        <Stat label={t('mostUsedAccount')} value={data.accName(data.stats.mostUsedAccountId)} />
        <Stat label={t('transactionCount')} value={String(data.stats.transactionCount)} />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium tabular-nums">{value}</p>
    </div>
  )
}
