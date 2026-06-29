# Reports & Statistics (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only reports & statistics layer (income/expense, category distribution, monthly series, and key stats) over existing data — no schema or backup changes.

**Architecture:** A `reportsRepo` computing currency-scoped aggregations over transactions/accounts/categories, plus a `/reports` page with a monthly bar chart, a category pie, an income/expense summary, statistics cards, and currency/period selectors. Settings access link.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Recharts, date-fns, Tailwind (RTL), Vitest + fake-indexeddb.

## Global Constraints

- Money stored as integer minor units (cents); never floats.
- All report figures are scoped to ONE selected currency (default = settings default); computed only from transactions in accounts of that currency. **No currency conversion, no cross-currency summation.**
- Exclude soft-deleted transactions and exclude transfers from income/expense aggregations.
- No new Dexie tables; no `SCHEMA_VERSION` bump; no backup changes.
- UI Arabic only, RTL. Fully offline.
- TDD for the repo; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task RP1: reportsRepo (currency-scoped aggregations + statistics)

**Files:**
- Create: `src/db/reportsRepo.ts`
- Test: `tests/db/reportsRepo.test.ts`

**Interfaces:**
- Consumes: `db`.
- Produces:
  - `incomeExpenseTotals(from: string, to: string, currency: string): Promise<{ income: number; expense: number; net: number }>`
  - `categorySpending(from: string, to: string, currency: string): Promise<Array<{ categoryId: string | null; total: number }>>` — expense totals grouped by category, descending.
  - `monthlyTotals(year: number, currency: string): Promise<Array<{ month: string; income: number; expense: number }>>` — 12 entries `${year}-01`..`${year}-12`.
  - `Statistics` (see code) and `statistics(from: string, to: string, currency: string): Promise<Statistics>`.

All functions: exclude `deletedAt`; income/expense aggregations exclude `transfer`; scope to transactions whose account currency equals `currency`.

- [ ] **Step 1: Write the failing test**

`tests/db/reportsRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../src/db/reportsRepo'
import { createAccount } from '../../src/db/accountsRepo'

let eur = '', usd = ''
beforeEach(async () => {
  await db.delete(); await db.open()
  eur = (await createAccount({ name: 'E', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })).id
  usd = (await createAccount({ name: 'U', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })).id
})

async function tx(p: any) {
  await db.transactions.add({ id: crypto.randomUUID(), tags: [], createdAt: 't', updatedAt: 't', ...p })
}

describe('reportsRepo', () => {
  it('income/expense totals are currency-scoped and exclude transfers + deleted', async () => {
    await tx({ type: 'income', amount: 9000, accountId: eur, date: '2026-06-01' })
    await tx({ type: 'expense', amount: 2000, accountId: eur, date: '2026-06-02' })
    await tx({ type: 'expense', amount: 999, accountId: eur, date: '2026-06-03', deletedAt: 't' })
    await tx({ type: 'transfer', transferDirection: 'out', amount: 500, accountId: eur, date: '2026-06-04' })
    await tx({ type: 'expense', amount: 7777, accountId: usd, date: '2026-06-05' }) // other currency
    expect(await incomeExpenseTotals('2026-06-01', '2026-06-30', 'EUR')).toEqual({ income: 9000, expense: 2000, net: 7000 })
  })
  it('category spending grouped and descending (EUR only)', async () => {
    await tx({ type: 'expense', amount: 500, accountId: eur, categoryId: 'food', date: '2026-06-01' })
    await tx({ type: 'expense', amount: 300, accountId: eur, categoryId: 'food', date: '2026-06-02' })
    await tx({ type: 'expense', amount: 1000, accountId: eur, categoryId: 'rent', date: '2026-06-03' })
    await tx({ type: 'expense', amount: 9999, accountId: usd, categoryId: 'food', date: '2026-06-04' })
    expect(await categorySpending('2026-06-01', '2026-06-30', 'EUR')).toEqual([
      { categoryId: 'rent', total: 1000 },
      { categoryId: 'food', total: 800 },
    ])
  })
  it('monthly totals returns 12 entries with per-month income/expense', async () => {
    await tx({ type: 'income', amount: 5000, accountId: eur, date: '2026-01-15' })
    await tx({ type: 'expense', amount: 2000, accountId: eur, date: '2026-03-10' })
    const series = await monthlyTotals(2026, 'EUR')
    expect(series).toHaveLength(12)
    expect(series[0]).toEqual({ month: '2026-01', income: 5000, expense: 0 })
    expect(series[2]).toEqual({ month: '2026-03', income: 0, expense: 2000 })
  })
  it('statistics: largest tx, avg daily expense, top category, most-used account, count', async () => {
    await tx({ type: 'expense', amount: 500, accountId: eur, categoryId: 'food', date: '2026-06-01' })
    await tx({ type: 'expense', amount: 1500, accountId: eur, categoryId: 'food', date: '2026-06-02' })
    await tx({ type: 'income', amount: 9000, accountId: eur, date: '2026-06-03' })
    const s = await statistics('2026-06-01', '2026-06-02', 'EUR') // 2-day window
    expect(s.transactionCount).toBe(2)
    expect(s.largestExpense?.amount).toBe(1500)
    expect(s.largestIncome).toBeNull() // income on 06-03 is outside the window
    expect(s.avgDailyExpense).toBe(1000) // (500+1500)/2 days
    expect(s.topCategoryId).toBe('food')
    expect(s.topCategoryTotal).toBe(2000)
    expect(s.mostUsedAccountId).toBe(eur)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- reportsRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/reportsRepo.ts`:
```ts
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from './schema'
import type { Transaction } from './types'

async function scopedTxs(from: string, to: string, currency: string): Promise<Transaction[]> {
  const [accounts, txs] = await Promise.all([db.accounts.toArray(), db.transactions.toArray()])
  const cur: Record<string, string> = {}
  for (const a of accounts) cur[a.id] = a.currency
  return txs.filter(t => !t.deletedAt && t.date >= from && t.date <= to && cur[t.accountId] === currency)
}

export async function incomeExpenseTotals(from: string, to: string, currency: string): Promise<{ income: number; expense: number; net: number }> {
  const rows = await scopedTxs(from, to, currency)
  const income = rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, net: income - expense }
}

export async function categorySpending(from: string, to: string, currency: string): Promise<Array<{ categoryId: string | null; total: number }>> {
  const rows = (await scopedTxs(from, to, currency)).filter(t => t.type === 'expense')
  const map = new Map<string | null, number>()
  for (const t of rows) {
    const key = t.categoryId ?? null
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total)
}

export async function monthlyTotals(year: number, currency: string): Promise<Array<{ month: string; income: number; expense: number }>> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const rows = await scopedTxs(from, to, currency)
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    return { month, income: 0, expense: 0 }
  })
  for (const t of rows) {
    const idx = Number(t.date.slice(5, 7)) - 1
    if (idx < 0 || idx > 11) continue
    if (t.type === 'income') months[idx].income += t.amount
    else if (t.type === 'expense') months[idx].expense += t.amount
  }
  return months
}

export interface Statistics {
  transactionCount: number
  largestExpense: Transaction | null
  largestIncome: Transaction | null
  avgDailyExpense: number
  topCategoryId: string | null
  topCategoryTotal: number
  mostUsedAccountId: string | null
}

export async function statistics(from: string, to: string, currency: string): Promise<Statistics> {
  const rows = await scopedTxs(from, to, currency)
  const incExp = rows.filter(t => t.type === 'income' || t.type === 'expense')
  const expenses = rows.filter(t => t.type === 'expense')
  const incomes = rows.filter(t => t.type === 'income')

  const largest = (list: Transaction[]) =>
    list.length === 0 ? null : list.reduce((m, t) => (t.amount > m.amount ? t : m))

  const days = Math.max(1, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)

  const catMap = new Map<string | null, number>()
  for (const t of expenses) catMap.set(t.categoryId ?? null, (catMap.get(t.categoryId ?? null) ?? 0) + t.amount)
  let topCategoryId: string | null = null
  let topCategoryTotal = 0
  for (const [k, v] of catMap) if (v > topCategoryTotal) { topCategoryTotal = v; topCategoryId = k }

  const acctMap = new Map<string, number>()
  for (const t of incExp) acctMap.set(t.accountId, (acctMap.get(t.accountId) ?? 0) + 1)
  let mostUsedAccountId: string | null = null
  let mostUsedCount = 0
  for (const [k, v] of acctMap) if (v > mostUsedCount) { mostUsedCount = v; mostUsedAccountId = k }

  return {
    transactionCount: incExp.length,
    largestExpense: largest(expenses),
    largestIncome: largest(incomes),
    avgDailyExpense: Math.round(totalExpense / days),
    topCategoryId,
    topCategoryTotal,
    mostUsedAccountId,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- reportsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/reportsRepo.ts tests/db/reportsRepo.test.ts
git commit -m "feat: add reports repository with currency-scoped aggregations and statistics"
```

---

### Task RP2: Reports page (charts, stats, selectors) + settings link

**Files:**
- Create: `src/features/reports/ReportsPage.tsx`, `MonthlyBar.tsx`
- Modify: `src/i18n/ar.ts`, `src/App.tsx` (route `/reports`), `src/features/backup/BackupPage.tsx` (link)
- Test: `tests/features/ReportsPage.test.tsx`

**Interfaces:**
- Consumes: `incomeExpenseTotals`, `categorySpending`, `monthlyTotals`, `statistics` (RP1); `listAccounts`, `listCategories`, `getSettings`; `formatMoney`; `isoDate`, `monthRange`; `CategoryPie` (reuse from dashboard).
- Produces: a `/reports` page with currency + period selectors, an income/expense/net summary, a monthly bar chart, a category pie, statistics cards, and a settings access link.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings` (add only missing keys — `income`/`expense`/`category`/`account`/`currency` already exist):
```ts
  reports: 'التقارير',
  net: 'الصافي',
  period: 'الفترة',
  thisMonth: 'هذا الشهر',
  lastMonth: 'الشهر الماضي',
  thisYear: 'هذه السنة',
  largestExpense: 'أكبر مصروف',
  largestIncome: 'أكبر دخل',
  avgDailyExpense: 'متوسط الإنفاق اليومي',
  topCategory: 'أكثر تصنيف إنفاقًا',
  mostUsedAccount: 'أكثر حساب استخدامًا',
  transactionCount: 'عدد العمليات',
  monthly: 'شهريًا',
```
(Note: `net` may already exist from an earlier task — add only if missing; never duplicate an object key.)

- [ ] **Step 2: Write the failing test**

`tests/features/ReportsPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { ReportsPage } from '../../src/features/reports/ReportsPage'

beforeEach(async () => {
  await db.delete(); await db.open()
  await createAccount({ name: 'E', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
})

describe('ReportsPage', () => {
  it('renders the reports heading and net summary label', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('التقارير')).toBeInTheDocument())
    expect(screen.getByText('الصافي')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- ReportsPage`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the monthly bar chart**

`src/features/reports/MonthlyBar.tsx`:
```tsx
import { BarChart, Bar, XAxis, ResponsiveContainer } from 'recharts'

export function MonthlyBar({ data }: { data: Array<{ month: string; income: number; expense: number }> }) {
  const chart = data.map((d) => ({ name: d.month.slice(5), income: d.income / 100, expense: d.expense / 100 }))
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <BarChart data={chart}>
          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
          <Bar dataKey="income" fill="#10b981" />
          <Bar dataKey="expense" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 5: Write the page**

`src/features/reports/ReportsPage.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { incomeExpenseTotals, categorySpending, monthlyTotals, statistics } from '../../db/reportsRepo'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { getSettings } from '../../db/settingsRepo'
import { isoDate, monthRange } from '../../lib/date'
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
    const settings = await getSettings()
    const accounts = await listAccounts()
    const currencies = [...new Set(accounts.map((a) => a.currency))]
    const cur = currency || settings.defaultCurrency || currencies[0] || 'EUR'
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
        <h2 className="mb-2 text-sm text-gray-500">{t('monthly')}</h2>
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
```

- [ ] **Step 6: Wire route + settings link**

In `src/App.tsx`: import `ReportsPage` and add `<Route path="/reports" element={<ReportsPage />} />` in the `AppShell` group.

In `src/features/backup/BackupPage.tsx`: add a link to the access-links nav block:
```tsx
<Link to="/reports" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('reports')}</Link>
```

- [ ] **Step 7: Run tests + build**

Run: `npm test -- ReportsPage` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

> Recharts `ResponsiveContainer` renders nothing measurable in jsdom — the test only checks headings, not chart contents.

- [ ] **Step 8: Commit**

```bash
git add src/features/reports src/i18n/ar.ts src/App.tsx src/features/backup/BackupPage.tsx tests/features/ReportsPage.test.tsx
git commit -m "feat: add reports page with charts, statistics and period/currency selectors"
```

---

## Self-Review

**Spec coverage:** currency-scoped aggregations + statistics (RP1) ✓; reports page with income/expense/net summary, monthly bar, category pie, six statistics cards, currency+period selectors, settings link (RP2) ✓. No schema/backup change (read-only) ✓.

**Placeholder scan:** none — all steps contain full code.

**Type consistency:** `Statistics` defined in RP1, consumed in RP2; `incomeExpenseTotals`/`categorySpending`/`monthlyTotals`/`statistics` signatures consistent; reuses existing `CategoryPie`, `monthRange`, `isoDate`, `formatMoney`, `listAccounts`, `listCategories`, `getSettings`.

**Note on i18n:** `net` may already exist — RP2 step 1 instructs to add only missing keys.

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
