# Recurring Transactions (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add recurring income/expense rules that auto-generate transactions (with catch-up) when the app opens.

**Architecture:** A new Dexie table `recurringRules` (schema v3→v4), a `recurringRepo` with CRUD + `advanceDate` + `processDueRules` (the catch-up engine that calls `createTransaction`), a recurring page + form, a settings-page link, and a `processDueRules` call wired into app bootstrap. Backup updated to include the table and accept v1–v4.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, date-fns, Tailwind (RTL), Vitest + fake-indexeddb.

## Global Constraints

- Money stored as integer minor units (cents); never floats.
- Recurring rules support `income` and `expense` only (no transfers this phase).
- Frequencies: `daily`/`weekly`/`monthly`/`yearly` with `interval ≥ 1`.
- Generated transactions use the actual due date (`nextRunDate` at generation time); catch-up generates every missed period up to today, respecting `endDate`, then deactivates the rule once `nextRunDate` passes `endDate`.
- UI Arabic only, RTL. IDs are `crypto.randomUUID()` strings.
- Fully offline; no network calls.
- Schema upgrade to version 4 must preserve existing v1/v2/v3 data (additive only).
- TDD for all logic; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task R1: RecurringRule type + Dexie schema v4

**Files:**
- Modify: `src/db/types.ts`, `src/db/schema.ts`
- Test: `tests/db/schemaV4.test.ts`

**Interfaces:**
- Produces: `RecurringFrequency`, `RecurringRule` types; `db.recurringRules` table; `SCHEMA_VERSION = 4`.

- [ ] **Step 1: Write the failing test**

`tests/db/schemaV4.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v4', () => {
  it('is version 4 and exposes recurringRules', () => {
    expect(SCHEMA_VERSION).toBe(4)
    expect(db.recurringRules).toBeTruthy()
  })
  it('round-trips a recurring rule', async () => {
    await db.recurringRules.add({ id: 'r1', type: 'expense', amount: 2000, accountId: 'a1', tags: [], frequency: 'monthly', interval: 1, startDate: '2026-06-01', nextRunDate: '2026-06-01', isActive: true, createdAt: 't', updatedAt: 't' })
    expect((await db.recurringRules.get('r1'))?.amount).toBe(2000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schemaV4`
Expected: FAIL (`SCHEMA_VERSION` is 3 / table undefined).

- [ ] **Step 3: Add the types**

In `src/db/types.ts` add:
```ts
export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id: string
  type: 'income' | 'expense'
  amount: number // cents
  accountId: string
  categoryId?: string
  notes?: string
  merchant?: string
  tags: string[]
  frequency: RecurringFrequency
  interval: number // >= 1
  startDate: string // yyyy-MM-dd
  endDate?: string // yyyy-MM-dd
  nextRunDate: string // yyyy-MM-dd
  lastRunDate?: string // yyyy-MM-dd
  isActive: boolean
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Bump the schema**

In `src/db/schema.ts`:
- import `RecurringRule` from `./types`.
- change `SCHEMA_VERSION = 3` to `= 4`.
- add field `recurringRules!: Table<RecurringRule, string>` to `MoneyDB`.
- keep the existing `version(1)`, `version(2)`, `version(3)` blocks, and ADD:
```ts
this.version(4).stores({
  accounts: 'id, isArchived, sortOrder',
  categories: 'id, type, parentId, isArchived',
  transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
  settings: 'id',
  budgets: 'id, categoryId, month, [month+currency]',
  goals: 'id, isArchived, sortOrder',
  goalContributions: 'id, goalId',
  recurringRules: 'id, isActive, nextRunDate',
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- schemaV4`
Expected: PASS.

- [ ] **Step 6: Full suite (no regressions)**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/db/schema.ts tests/db/schemaV4.test.ts
git commit -m "feat: add recurringRules table, bump schema to v4"
```

---

### Task R2: recurringRepo (CRUD + advanceDate + processDueRules)

**Files:**
- Create: `src/db/recurringRepo.ts`
- Test: `tests/db/recurringRepo.test.ts`

**Interfaces:**
- Consumes: `db`, `id()`, `createTransaction` from `./transactionsRepo`.
- Produces:
  - `createRule(input: { type: 'income'|'expense'; amount: number; accountId: string; categoryId?: string; notes?: string; merchant?: string; tags?: string[]; frequency: RecurringFrequency; interval: number; startDate: string; endDate?: string }): Promise<RecurringRule>` — sets `nextRunDate = startDate`, `isActive = true`.
  - `updateRule(id: string, patch: Partial<RecurringRule>): Promise<void>`
  - `deleteRule(id: string): Promise<void>`
  - `listRules(includeInactive?: boolean): Promise<RecurringRule[]>` sorted by `nextRunDate`.
  - `advanceDate(date: string, frequency: RecurringFrequency, interval: number): string`
  - `processDueRules(today: string): Promise<number>` — generates due transactions with catch-up; returns count created.

- [ ] **Step 1: Write the failing test**

`tests/db/recurringRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createRule, listRules, updateRule, deleteRule, advanceDate, processDueRules } from '../../src/db/recurringRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('advanceDate', () => {
  it('advances by each frequency and interval', () => {
    expect(advanceDate('2026-06-01', 'daily', 1)).toBe('2026-06-02')
    expect(advanceDate('2026-06-01', 'weekly', 2)).toBe('2026-06-15')
    expect(advanceDate('2026-06-01', 'monthly', 1)).toBe('2026-07-01')
    expect(advanceDate('2026-06-01', 'yearly', 1)).toBe('2027-06-01')
  })
})

describe('recurringRepo CRUD', () => {
  it('creates with nextRunDate=startDate and active, lists, updates, deletes', async () => {
    const r = await createRule({ type: 'expense', amount: 2000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    expect(r.nextRunDate).toBe('2026-06-01')
    expect(r.isActive).toBe(true)
    expect((await listRules()).map(x => x.id)).toEqual([r.id])
    await updateRule(r.id, { amount: 3000 })
    expect((await listRules())[0].amount).toBe(3000)
    await deleteRule(r.id)
    expect(await listRules()).toHaveLength(0)
  })
})

describe('processDueRules', () => {
  it('does not generate before startDate', async () => {
    await createRule({ type: 'expense', amount: 2000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-07-01' })
    const created = await processDueRules('2026-06-15')
    expect(created).toBe(0)
    expect(await db.transactions.count()).toBe(0)
  })
  it('generates one transaction when exactly due and advances nextRunDate', async () => {
    const r = await createRule({ type: 'income', amount: 500000, accountId: 'a1', categoryId: 'salary', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    const created = await processDueRules('2026-06-01')
    expect(created).toBe(1)
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0].amount).toBe(500000)
    expect(txs[0].date).toBe('2026-06-01')
    expect(txs[0].type).toBe('income')
    expect((await db.recurringRules.get(r.id))?.nextRunDate).toBe('2026-07-01')
    expect((await db.recurringRules.get(r.id))?.lastRunDate).toBe('2026-06-01')
  })
  it('catches up multiple missed periods up to today', async () => {
    await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-01-01' })
    const created = await processDueRules('2026-04-15')
    expect(created).toBe(4) // Jan, Feb, Mar, Apr
    expect(await db.transactions.count()).toBe(4)
  })
  it('respects endDate and deactivates the rule after it passes', async () => {
    const r = await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-01-01', endDate: '2026-02-15' })
    const created = await processDueRules('2026-12-31')
    expect(created).toBe(2) // Jan 1, Feb 1 (Mar 1 > endDate)
    expect((await db.recurringRules.get(r.id))?.isActive).toBe(false)
  })
  it('skips inactive rules', async () => {
    const r = await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'daily', interval: 1, startDate: '2026-06-01' })
    await updateRule(r.id, { isActive: false })
    expect(await processDueRules('2026-06-10')).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- recurringRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/recurringRepo.ts`:
```ts
import { format, addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns'
import { db } from './schema'
import { id } from '../lib/uuid'
import { createTransaction } from './transactionsRepo'
import type { RecurringRule, RecurringFrequency } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateRuleInput {
  type: 'income' | 'expense'
  amount: number
  accountId: string
  categoryId?: string
  notes?: string
  merchant?: string
  tags?: string[]
  frequency: RecurringFrequency
  interval: number
  startDate: string
  endDate?: string
}

export async function createRule(input: CreateRuleInput): Promise<RecurringRule> {
  const rule: RecurringRule = {
    id: id(),
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    categoryId: input.categoryId,
    notes: input.notes,
    merchant: input.merchant,
    tags: input.tags ?? [],
    frequency: input.frequency,
    interval: input.interval,
    startDate: input.startDate,
    endDate: input.endDate,
    nextRunDate: input.startDate,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.recurringRules.add(rule)
  return rule
}

export async function updateRule(ruleId: string, patch: Partial<RecurringRule>): Promise<void> {
  await db.recurringRules.update(ruleId, { ...patch, updatedAt: nowIso() })
}

export async function deleteRule(ruleId: string): Promise<void> {
  await db.recurringRules.delete(ruleId)
}

export async function listRules(includeInactive = false): Promise<RecurringRule[]> {
  const rows = await db.recurringRules.toArray()
  return rows
    .filter(r => includeInactive || r.isActive)
    .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
}

export function advanceDate(date: string, frequency: RecurringFrequency, interval: number): string {
  const d = parseISO(date)
  const advanced =
    frequency === 'daily' ? addDays(d, interval)
    : frequency === 'weekly' ? addWeeks(d, interval)
    : frequency === 'monthly' ? addMonths(d, interval)
    : addYears(d, interval)
  return format(advanced, 'yyyy-MM-dd')
}

export async function processDueRules(today: string): Promise<number> {
  const rules = await db.recurringRules.toArray()
  let created = 0
  for (const rule of rules) {
    if (!rule.isActive) continue
    let next = rule.nextRunDate
    let last = rule.lastRunDate
    while (next <= today && (!rule.endDate || next <= rule.endDate)) {
      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        date: next,
        notes: rule.notes,
        merchant: rule.merchant,
        tags: rule.tags,
      })
      last = next
      next = advanceDate(next, rule.frequency, rule.interval)
      created++
    }
    const deactivate = !!rule.endDate && next > rule.endDate
    await updateRule(rule.id, {
      nextRunDate: next,
      lastRunDate: last,
      isActive: deactivate ? false : rule.isActive,
    })
  }
  return created
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- recurringRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/recurringRepo.ts tests/db/recurringRepo.test.ts
git commit -m "feat: add recurring rules repository with catch-up generation engine"
```

---

### Task R3: Backup includes recurringRules + accepts v1–v4

**Files:**
- Modify: `src/db/backupRepo.ts`
- Test: `tests/db/backupRecurring.test.ts`

**Interfaces:**
- `exportBackup` output now contains `recurringRules` (schemaVersion 4).
- `importBackup` accepts `schemaVersion` 1–4; missing arrays `[]`. Replace-all atomic; `INVALID_BACKUP` for malformed; `INCOMPATIBLE_VERSION` for versions outside {1,2,3,4}.

- [ ] **Step 1: Write the failing test**

`tests/db/backupRecurring.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with recurring rules', () => {
  it('round-trips recurring rules', async () => {
    await db.recurringRules.add({ id: 'r1', type: 'expense', amount: 2000, accountId: 'a1', tags: [], frequency: 'monthly', interval: 1, startDate: '2026-06-01', nextRunDate: '2026-06-01', isActive: true, createdAt: 't', updatedAt: 't' })
    const json = await exportBackup()
    expect(JSON.parse(json).recurringRules).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.recurringRules.count()).toBe(1)
  })
  it('accepts a v3 backup (no recurringRules field)', async () => {
    const v3 = JSON.stringify({ schemaVersion: 3, exportedAt: 't', accounts: [], categories: [], transactions: [], settings: null, budgets: [], goals: [], goalContributions: [] })
    await importBackup(v3)
    expect(await db.recurringRules.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backupRecurring`
Expected: FAIL (export lacks recurringRules; v4/version guard not updated).

- [ ] **Step 3: Update the implementation**

In `src/db/backupRepo.ts`:
- import `RecurringRule` from `./types`; add `recurringRules: RecurringRule[]` to `BackupShape`.
- in `exportBackup`, read `db.recurringRules.toArray()` and include it in the payload.
- in `importBackup`, change the version guard to accept `1,2,3,4` (e.g. `if (![1, 2, 3, 4].includes(data.schemaVersion)) throw new Error('INCOMPATIBLE_VERSION')`).
- in the import transaction, add `db.recurringRules` to the table list (array form), `clear()` it, and `bulkAdd(data.recurringRules ?? [])`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backupRecurring backupGoals backupBudgets backupRepo`
Expected: PASS (all backup suites).

- [ ] **Step 5: Commit**

```bash
git add src/db/backupRepo.ts tests/db/backupRecurring.test.ts
git commit -m "feat: include recurring rules in backup and accept v1-v4 imports"
```

---

### Task R4: Recurring UI + bootstrap wiring + settings link

**Files:**
- Create: `src/features/recurring/RecurringPage.tsx`, `RecurringForm.tsx`
- Modify: `src/i18n/ar.ts`, `src/App.tsx` (route `/recurring`), `src/features/backup/BackupPage.tsx` (link), `src/app/bootstrap.ts` (call processDueRules)
- Test: `tests/features/RecurringPage.test.tsx`

**Interfaces:**
- Consumes: `listRules`, `createRule`, `deleteRule`, `updateRule` (R2); `processDueRules` (R2, in bootstrap); `listAccounts`, `listCategories`, `getSettings`; `formatMoney`, `parseAmount`, `isoDate`.
- Produces: a `/recurring` page listing rules with add/delete/toggle, a create form, a settings link, and bootstrap generation on app open.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings`:
```ts
  recurring: 'العمليات المتكررة',
  addRecurring: 'إضافة عملية متكررة',
  frequency: 'التكرار',
  every: 'كل',
  daily: 'يوم',
  weekly: 'أسبوع',
  monthly: 'شهر',
  yearly: 'سنة',
  startDate: 'تاريخ البداية',
  endDate: 'تاريخ النهاية',
  nextRun: 'التشغيل التالي',
  active: 'نشِطة',
```
(Note: `startDate`/`endDate` may already exist from the goals task — if a key already exists, do NOT duplicate it; reuse the existing one and only add the keys that are missing.)

- [ ] **Step 2: Write the failing test**

`tests/features/RecurringPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createRule } from '../../src/db/recurringRepo'
import { RecurringPage } from '../../src/features/recurring/RecurringPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('RecurringPage', () => {
  it('lists active rules by merchant', async () => {
    await createRule({ type: 'expense', amount: 1599, accountId: 'a1', merchant: 'Netflix', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    render(<MemoryRouter><RecurringPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- RecurringPage`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the form**

`src/features/recurring/RecurringForm.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { createRule } from '../../db/recurringRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import type { RecurringFrequency } from '../../db/types'

const freqs: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly']

export function RecurringForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchant, setMerchant] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [interval, setInterval] = useState('1')
  const [startDate, setStartDate] = useState(isoDate(new Date()))
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const accounts = useLiveQuery(() => listAccounts(), [], [])
  const categories = useLiveQuery(() => listCategories(type), [type], [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!accountId) { setError('اختر حسابًا'); return }
    try {
      await createRule({
        type, amount: parseAmount(amount), accountId,
        categoryId: categoryId || undefined,
        merchant: merchant || undefined,
        frequency, interval: Math.max(1, Number(interval) || 1),
        startDate, endDate: endDate || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(['expense', 'income'] as const).map((ty) => (
          <Button key={ty} type="button" variant={type === ty ? 'primary' : 'ghost'} onClick={() => setType(ty)}>{t(ty)}</Button>
        ))}
      </div>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('account')}>
        <select className="w-full rounded-lg border p-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label={t('category')}>
        <select className="w-full rounded-lg border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label={t('merchant')}>
        <input className="w-full rounded-lg border p-2" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Field label={t('every')}>
          <input className="w-20 rounded-lg border p-2" inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
        <Field label={t('frequency')}>
          <select className="w-full rounded-lg border p-2" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
            {freqs.map((f) => <option key={f} value={f}>{t(f)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t('startDate')}>
        <input type="date" className="w-full rounded-lg border p-2" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label={t('endDate')}>
        <input type="date" className="w-full rounded-lg border p-2" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
```

- [ ] **Step 5: Write the page**

`src/features/recurring/RecurringPage.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listRules, deleteRule, updateRule } from '../../db/recurringRepo'
import { formatMoney } from '../../lib/money'
import { RecurringForm } from './RecurringForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function RecurringPage() {
  const [open, setOpen] = useState(false)
  const rules = useLiveQuery(() => listRules(true), [], [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('recurring')}</h1>
        <Button onClick={() => setOpen(true)}>{t('addRecurring')}</Button>
      </div>
      {rules.length === 0 && <EmptyState message={t('noData')} />}
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div>
            <p className="font-medium">{r.merchant || t(r.type)}</p>
            <p className="text-xs text-gray-400">{t('every')} {r.interval} {t(r.frequency)} · {t('nextRun')}: {r.nextRunDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>{formatMoney(r.amount, 'EUR')}</span>
            <button aria-label={t('active')} onClick={() => updateRule(r.id, { isActive: !r.isActive })}>{r.isActive ? '⏸' : '▶'}</button>
            <button aria-label={t('delete')} onClick={async () => { if (window.confirm('حذف هذه العملية المتكررة؟')) await deleteRule(r.id) }}>🗑</button>
          </div>
        </div>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <RecurringForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
```
> Note: the amount uses `'EUR'` as a display fallback (rules don't store a currency — they inherit the account's). This matches the dashboard's documented MVP simplification; a later polish can look up the account currency.

- [ ] **Step 6: Wire route, settings link, and bootstrap**

In `src/App.tsx`: import `RecurringPage` and add `<Route path="/recurring" element={<RecurringPage />} />` in the `AppShell` group.

In `src/features/backup/BackupPage.tsx`: add a link to the existing access-links nav block:
```tsx
<Link to="/recurring" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('recurring')}</Link>
```

In `src/app/bootstrap.ts`: import `{ processDueRules }` from `../db/recurringRepo` and `{ isoDate }` from `../lib/date`; after seeding, run it without letting failures break bootstrap:
```ts
try {
  await processDueRules(isoDate(new Date()))
} catch (err) {
  console.error('recurring generation failed', err)
}
```

- [ ] **Step 7: Run tests + build**

Run: `npm test -- RecurringPage` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/recurring src/i18n/ar.ts src/App.tsx src/features/backup/BackupPage.tsx src/app/bootstrap.ts tests/features/RecurringPage.test.tsx
git commit -m "feat: add recurring transactions UI, route, settings link and bootstrap generation"
```

---

## Self-Review

**Spec coverage:** recurringRules table + schema v4 (R1) ✓; CRUD + advanceDate per frequency + processDueRules with catch-up/endDate/deactivation/skip-inactive (R2) ✓; backup include + v1–v4 (R3) ✓; page + form (income/expense, frequency+interval, dates) + settings link + bootstrap generation (R4) ✓.

**Placeholder scan:** none — all steps contain full code.

**Type consistency:** `RecurringFrequency`/`RecurringRule` defined in R1, used across R2/R3/R4; `createRule`/`processDueRules`/`advanceDate`/`listRules` signatures consistent; backup table list updated in R3; bootstrap imports `processDueRules` (R2) and `isoDate`.

**Note on i18n:** `startDate`/`endDate` keys may already exist from the goals task — R4 step 1 instructs to add only missing keys (no duplicates).

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
