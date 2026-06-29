# Budgets (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add monthly per-category budgets with spend progress and visual near/over alerts to the existing money manager.

**Architecture:** New Dexie table `budgets` (schema bumped to v2), a `budgetsRepo` with CRUD + `budgetProgress` (joins account currency like `rangeTotalsByCurrency`), a budgets page + form, a bottom-nav tab, and a dashboard budget-progress section. Backup updated to include budgets and accept v1/v2 imports.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Zustand, Tailwind (RTL), Vitest + fake-indexeddb.

## Global Constraints

- Money stored as integer minor units (cents); never floats.
- Each budget has its own `currency`; spend is computed only from transactions in accounts of that same currency. **No currency conversion.**
- Alert thresholds: `near` at ≥ 80%, `over` at ≥ 100%.
- UI Arabic only, RTL. IDs are `crypto.randomUUID()` strings.
- Fully offline; no network calls.
- Schema upgrade to version 2 must preserve existing v1 data (additive only).
- TDD for all logic; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task B1: Budget type + Dexie schema v2

**Files:**
- Modify: `src/db/types.ts` (add `Budget`), `src/db/schema.ts` (version 2 + `budgets` table)
- Test: `tests/db/schemaV2.test.ts`

**Interfaces:**
- Produces: `Budget` type; `db.budgets` table; `SCHEMA_VERSION = 2`.

- [ ] **Step 1: Write the failing test**

`tests/db/schemaV2.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v2', () => {
  it('is version 2 and exposes the budgets table', () => {
    expect(SCHEMA_VERSION).toBe(2)
    expect(db.budgets).toBeTruthy()
  })
  it('round-trips a budget', async () => {
    await db.budgets.add({ id: 'b1', categoryId: 'c1', month: '2026-06', amount: 30000, currency: 'EUR', createdAt: 't', updatedAt: 't' })
    expect((await db.budgets.get('b1'))?.amount).toBe(30000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schemaV2`
Expected: FAIL (`SCHEMA_VERSION` is 1 / `db.budgets` undefined).

- [ ] **Step 3: Add the type**

In `src/db/types.ts` add:
```ts
export interface Budget {
  id: string
  categoryId: string
  month: string // yyyy-MM
  amount: number // cents
  currency: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Bump the schema**

In `src/db/schema.ts`:
- import `Budget` from `./types`.
- change `export const SCHEMA_VERSION = 1` to `= 2`.
- add `budgets!: Table<Budget, string>` field to the `MoneyDB` class.
- add a `this.version(2).stores({...})` call that re-declares all existing stores AND adds `budgets`. Keep the existing `this.version(1).stores({...})` block intact above it so upgrades work. The v2 stores object:
```ts
this.version(2).stores({
  accounts: 'id, isArchived, sortOrder',
  categories: 'id, type, parentId, isArchived',
  transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
  settings: 'id',
  budgets: 'id, categoryId, month, [month+currency]',
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- schemaV2`
Expected: PASS.

- [ ] **Step 6: Run the full suite (no regressions from the schema bump)**

Run: `npm test`
Expected: all PASS (existing settingsRepo seeds `schemaVersion` from `SCHEMA_VERSION`; confirm its test still passes — it reads the constant, so v2 is fine).

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/db/schema.ts tests/db/schemaV2.test.ts
git commit -m "feat: add budgets table and bump Dexie schema to v2"
```

---

### Task B2: budgetsRepo (CRUD + progress)

**Files:**
- Create: `src/db/budgetsRepo.ts`
- Test: `tests/db/budgetsRepo.test.ts`

**Interfaces:**
- Consumes: `db`, `id()`, account currencies from `db.accounts`.
- Produces:
  - `createBudget(input: { categoryId: string; month: string; amount: number; currency: string }): Promise<Budget>` — throws `Error('DUPLICATE_BUDGET')` if one exists for the same `(categoryId, month, currency)`.
  - `updateBudget(id: string, patch: Partial<Budget>): Promise<void>`
  - `deleteBudget(id: string): Promise<void>`
  - `listBudgets(month: string): Promise<Budget[]>`
  - `BudgetProgress = { budget: Budget; spent: number; remaining: number; percent: number; status: 'ok'|'near'|'over' }`
  - `budgetProgress(month: string): Promise<BudgetProgress[]>` — `spent` = sum of non-deleted `expense` transactions whose category matches the budget, dated within `month`, in accounts whose currency equals the budget currency. `percent = amount>0 ? round(spent/amount*100) : 0`. `status`: `over` if percent ≥ 100, `near` if ≥ 80, else `ok`. `remaining = amount - spent`.

- [ ] **Step 1: Write the failing test**

`tests/db/budgetsRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createBudget, listBudgets, updateBudget, deleteBudget, budgetProgress } from '../../src/db/budgetsRepo'
import { createAccount } from '../../src/db/accountsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

async function addExpense(accountId: string, categoryId: string, amount: number, date: string) {
  await db.transactions.add({ id: crypto.randomUUID(), type: 'expense', amount, accountId, categoryId, date, tags: [], createdAt: 't', updatedAt: 't' })
}

describe('budgetsRepo', () => {
  it('creates, lists, updates and deletes', async () => {
    const b = await createBudget({ categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR' })
    expect((await listBudgets('2026-06')).map(x => x.id)).toEqual([b.id])
    await updateBudget(b.id, { amount: 40000 })
    expect((await listBudgets('2026-06'))[0].amount).toBe(40000)
    await deleteBudget(b.id)
    expect(await listBudgets('2026-06')).toHaveLength(0)
  })
  it('rejects a duplicate for same category+month+currency', async () => {
    await createBudget({ categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR' })
    await expect(createBudget({ categoryId: 'food', month: '2026-06', amount: 1, currency: 'EUR' }))
      .rejects.toThrow('DUPLICATE_BUDGET')
  })
  it('computes spent/remaining/percent/status from same-currency expenses in the month', async () => {
    const eur = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const usd = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })
    await createBudget({ categoryId: 'food', month: '2026-06', amount: 10000, currency: 'EUR' })
    await addExpense(eur.id, 'food', 8000, '2026-06-03')   // counts
    await addExpense(eur.id, 'food', 1000, '2026-05-30')   // wrong month, ignored
    await addExpense(usd.id, 'food', 5000, '2026-06-04')   // wrong currency, ignored
    const [p] = await budgetProgress('2026-06')
    expect(p.spent).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.status).toBe('near')
  })
  it('marks over when at or above 100 percent', async () => {
    const eur = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createBudget({ categoryId: 'rent', month: '2026-06', amount: 5000, currency: 'EUR' })
    await addExpense(eur.id, 'rent', 6000, '2026-06-10')
    const [p] = await budgetProgress('2026-06')
    expect(p.status).toBe('over')
    expect(p.percent).toBe(120)
    expect(p.remaining).toBe(-1000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- budgetsRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/budgetsRepo.ts`:
```ts
import { db } from './schema'
import { id } from '../lib/uuid'
import type { Budget } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateBudgetInput {
  categoryId: string
  month: string
  amount: number
  currency: string
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const existing = await db.budgets
    .where('[month+currency]').equals([input.month, input.currency])
    .filter(b => b.categoryId === input.categoryId)
    .first()
  if (existing) throw new Error('DUPLICATE_BUDGET')
  const budget: Budget = { id: id(), createdAt: nowIso(), updatedAt: nowIso(), ...input }
  await db.budgets.add(budget)
  return budget
}

export async function updateBudget(budgetId: string, patch: Partial<Budget>): Promise<void> {
  await db.budgets.update(budgetId, { ...patch, updatedAt: nowIso() })
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await db.budgets.delete(budgetId)
}

export async function listBudgets(month: string): Promise<Budget[]> {
  return db.budgets.where('month').equals(month).toArray()
}

export interface BudgetProgress {
  budget: Budget
  spent: number
  remaining: number
  percent: number
  status: 'ok' | 'near' | 'over'
}

export async function budgetProgress(month: string): Promise<BudgetProgress[]> {
  const [budgets, accounts, txs] = await Promise.all([
    listBudgets(month),
    db.accounts.toArray(),
    db.transactions.toArray(),
  ])
  const currencyOf: Record<string, string> = {}
  for (const a of accounts) currencyOf[a.id] = a.currency

  return budgets.map(budget => {
    const spent = txs
      .filter(t =>
        !t.deletedAt &&
        t.type === 'expense' &&
        t.categoryId === budget.categoryId &&
        t.date.slice(0, 7) === month &&
        currencyOf[t.accountId] === budget.currency,
      )
      .reduce((s, t) => s + t.amount, 0)
    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0
    const status: BudgetProgress['status'] = percent >= 100 ? 'over' : percent >= 80 ? 'near' : 'ok'
    return { budget, spent, remaining: budget.amount - spent, percent, status }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- budgetsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/budgetsRepo.ts tests/db/budgetsRepo.test.ts
git commit -m "feat: add budgets repository with progress computation"
```

---

### Task B3: Backup includes budgets + accepts v1/v2

**Files:**
- Modify: `src/db/backupRepo.ts`
- Test: `tests/db/backupBudgets.test.ts`

**Interfaces:**
- `exportBackup` output now contains a `budgets` array (schemaVersion 2).
- `importBackup` accepts `schemaVersion` 1 or 2; for v1 (or missing `budgets`) it imports budgets as `[]`. Still replaces all data atomically. Mismatched versions outside {1,2} still throw `INCOMPATIBLE_VERSION`; malformed JSON still throws `INVALID_BACKUP`.

- [ ] **Step 1: Write the failing test**

`tests/db/backupBudgets.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with budgets', () => {
  it('round-trips budgets in export/import', async () => {
    await db.budgets.add({ id: 'b1', categoryId: 'food', month: '2026-06', amount: 30000, currency: 'EUR', createdAt: 't', updatedAt: 't' })
    const json = await exportBackup()
    expect(JSON.parse(json).budgets).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.budgets.count()).toBe(1)
  })
  it('accepts a v1 backup (no budgets field) and imports zero budgets', async () => {
    const v1 = JSON.stringify({
      schemaVersion: 1, exportedAt: 't',
      accounts: [{ id: 'a1', name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0, isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' }],
      categories: [], transactions: [], settings: null,
    })
    await importBackup(v1)
    expect(await db.accounts.count()).toBe(1)
    expect(await db.budgets.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backupBudgets`
Expected: FAIL (export lacks `budgets`; v1 import rejected by the strict `!== SCHEMA_VERSION` check).

- [ ] **Step 3: Update the implementation**

In `src/db/backupRepo.ts`:
- Add `budgets: Budget[]` to the `BackupShape` interface (import `Budget` from `./types`).
- In `exportBackup`, also read `db.budgets.toArray()` and include `budgets` in the payload.
- In `importBackup`, replace the version check `if (data.schemaVersion !== SCHEMA_VERSION)` with `if (data.schemaVersion !== 1 && data.schemaVersion !== 2)` (throw `INCOMPATIBLE_VERSION` otherwise).
- In the transaction, also `db.budgets.clear()` and `db.budgets.bulkAdd(data.budgets ?? [])`. Add `db.budgets` to the `db.transaction('rw', ...)` table list.

Concretely, the export payload becomes:
```ts
const [accounts, categories, transactions, settings, budgets] = await Promise.all([
  db.accounts.toArray(),
  db.categories.toArray(),
  db.transactions.toArray(),
  db.settings.get('singleton'),
  db.budgets.toArray(),
])
const payload: BackupShape = {
  schemaVersion: SCHEMA_VERSION,
  exportedAt: new Date().toISOString(),
  accounts, categories, transactions, settings: settings ?? null, budgets,
}
```
and the import transaction:
```ts
await db.transaction('rw', db.accounts, db.categories, db.transactions, db.settings, db.budgets, async () => {
  await Promise.all([
    db.accounts.clear(), db.categories.clear(), db.transactions.clear(), db.settings.clear(), db.budgets.clear(),
  ])
  await db.accounts.bulkAdd(data.accounts)
  await db.categories.bulkAdd(data.categories ?? [])
  await db.transactions.bulkAdd(data.transactions ?? [])
  await db.budgets.bulkAdd(data.budgets ?? [])
  if (data.settings) await db.settings.put(data.settings)
})
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backupBudgets backupRepo`
Expected: PASS (both the new file and the original `backupRepo` test, which uses the current schema version, still pass).

- [ ] **Step 5: Commit**

```bash
git add src/db/backupRepo.ts tests/db/backupBudgets.test.ts
git commit -m "feat: include budgets in backup and accept v1/v2 imports"
```

---

### Task B4: Budgets UI (form, page, nav)

**Files:**
- Create: `src/features/budgets/BudgetForm.tsx`, `src/features/budgets/BudgetsPage.tsx`, `src/features/budgets/BudgetBar.tsx`
- Modify: `src/i18n/ar.ts` (budget keys), `src/App.tsx` (route `/budgets`), `src/routes/AppShell.tsx` (nav tab)
- Test: `tests/features/BudgetsPage.test.tsx`

**Interfaces:**
- Consumes: `listBudgets`, `createBudget`, `deleteBudget`, `budgetProgress` (Task B2), `listCategories('expense')`, `getSettings` (for default currency), `formatMoney`, `parseAmount`, `isoMonth`.
- Produces: a `/budgets` page listing the current month's budgets with progress bars + add/delete, a create form that blocks duplicates, and a new bottom-nav tab "الميزانيات".

- [ ] **Step 1: Add an `isoMonth` helper (needed by the page)**

In `src/lib/date.ts` add and export:
```ts
export function isoMonth(d: Date): string {
  return format(d, 'yyyy-MM')
}
```

- [ ] **Step 2: Add i18n keys**

In `src/i18n/ar.ts` add to the `strings` object:
```ts
  budgets: 'الميزانيات',
  budget: 'الميزانية',
  spent: 'المصروف',
  remaining: 'المتبقي',
  addBudget: 'إضافة ميزانية',
  duplicateBudget: 'توجد ميزانية لهذا التصنيف في هذا الشهر بنفس العملة',
  budgetProgress: 'تقدم الميزانية',
  viewAll: 'عرض الكل',
```

- [ ] **Step 3: Write the failing test**

`tests/features/BudgetsPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createBudget } from '../../src/db/budgetsRepo'
import { createCategory } from '../../src/db/categoriesRepo'
import { isoMonth } from '../../src/lib/date'
import { BudgetsPage } from '../../src/features/budgets/BudgetsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('BudgetsPage', () => {
  it('lists budgets for the current month with the category name', async () => {
    const cat = await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    await createBudget({ categoryId: cat.id, month: isoMonth(new Date()), amount: 30000, currency: 'EUR' })
    render(<MemoryRouter><BudgetsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('الطعام')).toBeInTheDocument())
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- BudgetsPage`
Expected: FAIL (module not found).

- [ ] **Step 5: Write the progress bar**

`src/features/budgets/BudgetBar.tsx`:
```tsx
const barColor: Record<'ok' | 'near' | 'over', string> = {
  ok: 'bg-emerald-500',
  near: 'bg-amber-500',
  over: 'bg-red-500',
}

export function BudgetBar({ percent, status }: { percent: number; status: 'ok' | 'near' | 'over' }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${barColor[status]}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 6: Write the form**

`src/features/budgets/BudgetForm.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listCategories } from '../../db/categoriesRepo'
import { getSettings } from '../../db/settingsRepo'
import { createBudget } from '../../db/budgetsRepo'
import { parseAmount } from '../../lib/money'
import { isoMonth } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function BudgetForm({ month, onDone }: { month?: string; onDone: () => void }) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const categories = useLiveQuery(() => listCategories('expense'), [], [])
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createBudget({
        categoryId,
        month: month ?? isoMonth(new Date()),
        amount: parseAmount(amount),
        currency: settings?.defaultCurrency ?? 'EUR',
      })
      onDone()
    } catch (err) {
      setError((err as Error).message === 'DUPLICATE_BUDGET' ? t('duplicateBudget') : 'تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('category')}>
        <select className="w-full rounded-lg border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
```

- [ ] **Step 7: Write the page**

`src/features/budgets/BudgetsPage.tsx`:
```tsx
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
```

- [ ] **Step 8: Wire the route and nav**

In `src/App.tsx`: import `BudgetsPage` from `./features/budgets/BudgetsPage` and add `<Route path="/budgets" element={<BudgetsPage />} />` inside the `AppShell` route group.

In `src/routes/AppShell.tsx`: add `{ to: '/budgets', label: t('budgets') }` to the `tabs` array (between transactions and settings).

- [ ] **Step 9: Run tests + build**

Run: `npm test -- BudgetsPage AppShell` then `npm run build`
Expected: tests PASS; build compiles. Run the full suite once: `npm test` — all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/budgets src/i18n/ar.ts src/lib/date.ts src/App.tsx src/routes/AppShell.tsx tests/features/BudgetsPage.test.tsx
git commit -m "feat: add budgets page, form and navigation"
```

---

### Task B5: Dashboard budget-progress section

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `tests/features/DashboardBudgets.test.tsx`

**Interfaces:**
- Consumes: `budgetProgress`, `listCategories`, `isoMonth`, `BudgetBar`, `Link`.
- Produces: a "تقدم الميزانية" section on the dashboard showing up to 3 budgets of the current month with progress bars, plus a "عرض الكل" link to `/budgets`. Renders nothing extra when there are no budgets (no empty section heading with no content is fine — show the heading only when there is at least one budget).

- [ ] **Step 1: Write the failing test**

`tests/features/DashboardBudgets.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createBudget } from '../../src/db/budgetsRepo'
import { createCategory } from '../../src/db/categoriesRepo'
import { isoMonth } from '../../src/lib/date'
import { DashboardPage } from '../../src/features/dashboard/DashboardPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DashboardPage budgets section', () => {
  it('shows the budget-progress heading when a budget exists', async () => {
    const cat = await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    await createBudget({ categoryId: cat.id, month: isoMonth(new Date()), amount: 30000, currency: 'EUR' })
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('تقدم الميزانية')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DashboardBudgets`
Expected: FAIL (no such heading yet).

- [ ] **Step 3: Update the dashboard**

In `src/features/dashboard/DashboardPage.tsx`:
- import `{ budgetProgress }` from `../../db/budgetsRepo`, `{ isoMonth }` from `../../lib/date` (already importing `monthRange`/`isoDate` — add `isoMonth`), `{ BudgetBar }` from `../budgets/BudgetBar`, and `{ Link }` from `react-router-dom`.
- in the `useLiveQuery`, compute `const budgets = (await budgetProgress(isoMonth(now)))` and map category names using the already-loaded expense `cats` (reuse the `catName` helper). Return the top 3: `budgets: budgets.slice(0, 3).map(p => ({ ...p, categoryName: catName(p.budget.categoryId) }))`.
- render a new section BEFORE the recent-transactions section, only when `data.budgets.length > 0`:
```tsx
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
```
Note `catName` currently returns `id: string | null`; budgets always pass a real id — that's compatible.

- [ ] **Step 4: Run tests + build**

Run: `npm test -- DashboardBudgets DashboardPage` then `npm run build`
Expected: tests PASS (including the existing DashboardPage test); build compiles. Run the full suite: `npm test` — all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx tests/features/DashboardBudgets.test.tsx
git commit -m "feat: show budget progress on the dashboard"
```

---

## Self-Review

**Spec coverage:** budgets table + schema v2 (B1) ✓; CRUD + duplicate guard + progress/status (B2) ✓; backup include + v1/v2 import (B3) ✓; page/form/nav with currency from settings + duplicate message (B4) ✓; dashboard "تقدم الميزانية" (B5) ✓. Alert thresholds 80/100 encoded in B2 and surfaced via BudgetBar colors in B4/B5.

**Placeholder scan:** none — all steps contain full code.

**Type consistency:** `BudgetProgress` shape defined in B2 and consumed in B4/B5; `isoMonth` added in B4 step 1 and reused in B5; `budgets` table added to the `db.transaction(...)` table list in B3. `createBudget` input shape consistent across B2/B4.

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
