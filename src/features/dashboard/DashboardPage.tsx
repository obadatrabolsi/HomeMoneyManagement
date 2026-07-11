import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { totalsByCurrency, listAccounts, accountBalance, resolveDefaultAccountId } from '../../db/accountsRepo'
import { dayTotalsByCurrency, rangeTotalsByCurrency, categoryBreakdown, recentTransactions, rangeTotals, queryTransactions } from '../../db/transactionsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { budgetProgress } from '../../db/budgetsRepo'
import { goalsWithProgress } from '../../db/goalsRepo'
import { isoDate, monthRange, isoMonth } from '../../lib/date'
import { formatMoney } from '../../lib/money'
import { CategoryPie } from './CategoryPie'
import { BalanceCard } from './BalanceCard'
import { BudgetBar } from '../budgets/BudgetBar'
import { GoalBar } from '../goals/GoalBar'
import { TransactionRow } from '../transactions/TransactionRow'
import { Card } from '../../components/ui/Card'
import { StatTile } from '../../components/ui/StatTile'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function DashboardPage() {
  // `override` is the user's explicit choice: null = follow the default account,
  // '' = all accounts, otherwise a specific account id.
  const [override, setOverride] = useState<string | null>(null)

  const data = useLiveQuery(async () => {
    const now = new Date()
    const today = isoDate(now)
    const month = monthRange(now)

    const accounts = await listAccounts()
    const defaultId = await resolveDefaultAccountId()
    const selected = override !== null ? override : (defaultId ?? '')
    // A stale override (e.g. its account was archived) falls back to "all".
    const scoped = selected !== '' && accounts.some((a) => a.id === selected)
    const scopedAccount = scoped ? accounts.find((a) => a.id === selected)! : null

    let totals: Record<string, number>
    let dayByCur: Record<string, { income: number; expense: number }>
    let monthByCur: Record<string, { income: number; expense: number }>
    let breakdown: Array<{ categoryId: string | null; total: number }>
    let recent

    if (scopedAccount) {
      const cur = scopedAccount.currency
      totals = { [cur]: await accountBalance(scopedAccount.id) }
      dayByCur = { [cur]: await rangeTotals(today, today, scopedAccount.id) }
      monthByCur = { [cur]: await rangeTotals(month.start, month.end, scopedAccount.id) }
      breakdown = await categoryBreakdown(month.start, month.end, scopedAccount.id)
      recent = (await queryTransactions({ accountId: scopedAccount.id, sort: 'date_desc' })).slice(0, 5)
    } else {
      totals = await totalsByCurrency()
      dayByCur = await dayTotalsByCurrency(today)
      monthByCur = await rangeTotalsByCurrency(month.start, month.end)
      breakdown = await categoryBreakdown(month.start, month.end)
      recent = await recentTransactions(5)
    }

    const cats = await listCategories('expense')
    const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? 'أخرى'
    const pie = breakdown.map((b) => ({ name: catName(b.categoryId), value: b.total / 100 }))
    const budgets = (await budgetProgress(isoMonth(now))).slice(0, 3).map(p => ({ ...p, categoryName: catName(p.budget.categoryId) }))
    const goals = (await goalsWithProgress()).slice(0, 3)
    const accCur: Record<string, string> = {}
    const accName: Record<string, string> = {}
    for (const a of accounts) { accCur[a.id] = a.currency; accName[a.id] = a.name }
    const monthNet: Record<string, number> = {}
    for (const [cur, tots] of Object.entries(monthByCur)) monthNet[cur] = tots.income - tots.expense
    // Keep the <select> value consistent: a stale id (archived account) reads as "all".
    return { totals, dayByCur, monthByCur, monthNet, pie, budgets, goals, recent, accCur, accName, accounts, selected: scoped ? selected : '' }
  }, [override], undefined)

  if (!data) return null

  const dayEntries = Object.entries(data.dayByCur)

  return (
    <div className="animate-fade-in space-y-4">
      {data.accounts.length > 0 && (
        <select
          className="input"
          aria-label={t('account')}
          value={data.selected}
          onChange={(e) => setOverride(e.target.value)}
        >
          <option value="">{t('allAccounts')}</option>
          {data.accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      <BalanceCard totals={data.totals} monthNet={data.monthNet} />

      {/* Today's income / expense */}
      {dayEntries.length > 0 ? (
        dayEntries.map(([cur, totals]) => (
          <div key={cur} className="grid grid-cols-2 gap-3">
            <StatTile label={`${t('todayIncome')} · ${cur}`} value={formatMoney(totals.income, cur)} tone="income" />
            <StatTile label={`${t('todayExpense')} · ${cur}`} value={formatMoney(totals.expense, cur)} tone="expense" />
          </div>
        ))
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <StatTile label={t('todayIncome')} value={t('noData')} tone="income" />
          <StatTile label={t('todayExpense')} value={t('noData')} tone="expense" />
        </div>
      )}

      {/* Month summary */}
      <Card title={t('monthSummary')}>
        {Object.entries(data.monthByCur).map(([cur, totals]) => {
          const net = totals.income - totals.expense
          return (
            <div key={cur} className="mb-3 space-y-1 last:mb-0">
              <p className="text-xs font-bold text-muted">{cur}</p>
              <div className="flex justify-between">
                <span className="text-xs text-muted">{t('income')}</span>
                <span className="text-income tabular-nums">{formatMoney(totals.income, cur)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-muted">{t('expense')}</span>
                <span className="text-expense tabular-nums">{formatMoney(totals.expense, cur)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1">
                <span className="text-xs font-semibold text-muted">{t('net')}</span>
                <span className={`font-semibold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(net, cur)}</span>
              </div>
            </div>
          )
        })}
        {Object.keys(data.monthByCur).length === 0 && <p className="text-muted">{t('noData')}</p>}
      </Card>

      {/* Expense distribution */}
      <Card title={t('expenseDistribution')}>
        <CategoryPie data={data.pie} />
      </Card>

      {/* Budgets */}
      {data.budgets.length > 0 && (
        <Card title={t('budgetProgress')} actionTo="/budgets" actionLabel={t('viewAll')} className="space-y-2">
          {data.budgets.map((p) => (
            <div key={p.budget.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{p.categoryName}</span>
                <span className={p.status === 'over' ? 'text-expense' : 'text-muted'}>{p.percent}%</span>
              </div>
              <BudgetBar percent={p.percent} status={p.status} />
            </div>
          ))}
        </Card>
      )}

      {/* Goals */}
      {data.goals.length > 0 && (
        <Card title={t('goals')} actionTo="/goals" actionLabel={t('viewAll')} className="space-y-2">
          {data.goals.map((p) => (
            <div key={p.goal.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium">{p.goal.name}</span>
                <span className="text-muted">{p.percent}%</span>
              </div>
              <GoalBar percent={p.percent} reached={p.reached} />
            </div>
          ))}
        </Card>
      )}

      {/* Recent transactions */}
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold text-muted">{t('recent')}</h2>
        {data.recent.length > 0 ? (
          data.recent.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={data.accCur[tx.accountId] ?? 'EUR'} accountName={data.accName[tx.accountId]} />)
        ) : (
          <EmptyState message={t('noData')} emoji="🧾" />
        )}
      </section>
    </div>
  )
}
