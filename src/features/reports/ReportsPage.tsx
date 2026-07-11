import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../db/reportsRepo'
import { listAccounts, resolveDefaultAccountId } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { monthRange } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { CategoryPie } from '../dashboard/CategoryPie'
import { MonthlyBar } from './MonthlyBar'
import { Field } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { StatTile } from '../../components/ui/StatTile'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { Button } from '../../components/ui/Button'
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
  // null = follow the default account, otherwise an explicit account id.
  const [override, setOverride] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodKey>('thisMonth')

  const data = useLiveQuery(async () => {
    const accounts = await listAccounts()
    const defaultId = await resolveDefaultAccountId()
    const selectedId = override !== null ? override : (defaultId ?? accounts[0]?.id ?? '')
    const account = accounts.find((a) => a.id === selectedId) ?? null
    const cur = account?.currency ?? 'EUR'
    const { from, to, year } = periodRange(period)
    const totals = await incomeExpenseTotals(from, to, selectedId)
    const cats = await listCategories('expense')
    const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    const spending = await categorySpending(from, to, selectedId)
    const pie = spending.map((s) => ({ name: catName(s.categoryId), value: s.total / 100 }))
    const monthly = await monthlyTotals(year, selectedId)
    const stats = await statistics(from, to, selectedId)
    const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—'
    return { cur, accounts, selectedId, totals, pie, monthly, stats, catName, accName }
  }, [override, period], undefined)

  if (!data) return null
  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('reports')}</h1>
        <Button variant="soft" className="no-print" onClick={() => window.print()}>{t('savePdf')}</Button>
      </div>
      <div className="flex gap-2">
        <Field label={t('account')}>
          <select className="input" aria-label={t('account')} value={data.selectedId} onChange={(e) => setOverride(e.target.value)}>
            {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t('period')}>
        <SegmentedControl
          options={[
            { value: 'thisMonth', label: t('thisMonth') },
            { value: 'lastMonth', label: t('lastMonth') },
            { value: 'thisYear', label: t('thisYear') },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as PeriodKey)}
        />
      </Field>

      <div className="grid grid-cols-3 gap-2">
        <StatTile label={t('income')} value={formatMoney(data.totals.income, data.cur)} tone="income" />
        <StatTile label={t('expense')} value={formatMoney(data.totals.expense, data.cur)} tone="expense" />
        <StatTile label={t('net')} value={formatMoney(data.totals.net, data.cur)} tone={data.totals.net < 0 ? 'expense' : 'income'} />
      </div>

      <Card title={t('monthlyReport')}>
        <MonthlyBar data={data.monthly} />
      </Card>

      <Card title={t('topCategory')}>
        <CategoryPie data={data.pie} />
      </Card>

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
    <div className="rounded-2xl bg-surface p-3.5 shadow-soft">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-semibold tabular-nums text-ink">{value}</p>
    </div>
  )
}
