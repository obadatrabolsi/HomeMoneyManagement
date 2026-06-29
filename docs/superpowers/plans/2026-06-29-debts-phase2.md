# Debts & Loans (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add debts/loans tracking (money I owe and money owed to me) with payment history and progress.

**Architecture:** Two new Dexie tables (`debts`, `debtPayments`; schema v4→v5), a `debtsRepo` (CRUD + payments + progress + per-direction remaining totals), a debts page (two sections) with debt + payment forms, and a settings access link. Backup updated to include the tables and accept v1–v5.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Tailwind (RTL), Vitest + fake-indexeddb.

## Global Constraints

- Money stored as integer minor units (cents); never floats.
- Each debt has its own `currency`; payments same-currency; **no conversion**; summaries grouped by currency, never summed across currencies. Payments do NOT touch account balances this phase.
- `percent = amount>0 ? round(paid/amount*100) : 0`; `settled = isSettled || (amount>0 && paid>=amount)`; `remaining = max(amount-paid, 0)`.
- UI Arabic only, RTL. IDs are `crypto.randomUUID()` strings.
- Fully offline; no network calls.
- Schema upgrade to version 5 must preserve existing v1–v4 data (additive only).
- TDD for all logic; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task D1: Debt + DebtPayment types + Dexie schema v5

**Files:**
- Modify: `src/db/types.ts`, `src/db/schema.ts`
- Test: `tests/db/schemaV5.test.ts`

**Interfaces:**
- Produces: `DebtDirection`, `Debt`, `DebtPayment` types; `db.debts`, `db.debtPayments` tables; `SCHEMA_VERSION = 5`.

- [ ] **Step 1: Write the failing test**

`tests/db/schemaV5.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v5', () => {
  it('is version 5 and exposes debts + debtPayments', () => {
    expect(SCHEMA_VERSION).toBe(5)
    expect(db.debts).toBeTruthy()
    expect(db.debtPayments).toBeTruthy()
  })
  it('round-trips a debt and a payment', async () => {
    await db.debts.add({ id: 'd1', direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR', isSettled: false, createdAt: 't', updatedAt: 't' })
    await db.debtPayments.add({ id: 'p1', debtId: 'd1', amount: 10000, date: '2026-06-01', createdAt: 't' })
    expect((await db.debts.get('d1'))?.person).toBe('أحمد')
    expect((await db.debtPayments.get('p1'))?.amount).toBe(10000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schemaV5`
Expected: FAIL (`SCHEMA_VERSION` is 4 / tables undefined).

- [ ] **Step 3: Add the types**

In `src/db/types.ts` add:
```ts
export type DebtDirection = 'owe' | 'owed'

export interface Debt {
  id: string
  direction: DebtDirection
  person: string
  amount: number // cents, total principal
  currency: string
  dueDate?: string // yyyy-MM-dd
  notes?: string
  isSettled: boolean
  createdAt: string
  updatedAt: string
}

export interface DebtPayment {
  id: string
  debtId: string
  amount: number // cents
  date: string // yyyy-MM-dd
  note?: string
  createdAt: string
}
```

- [ ] **Step 4: Bump the schema**

In `src/db/schema.ts`:
- import `Debt`, `DebtPayment` from `./types`.
- change `SCHEMA_VERSION = 4` to `= 5`.
- add fields `debts!: Table<Debt, string>` and `debtPayments!: Table<DebtPayment, string>` to `MoneyDB`.
- keep the existing `version(1)`..`version(4)` blocks and ADD:
```ts
this.version(5).stores({
  accounts: 'id, isArchived, sortOrder',
  categories: 'id, type, parentId, isArchived',
  transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
  settings: 'id',
  budgets: 'id, categoryId, month, [month+currency]',
  goals: 'id, isArchived, sortOrder',
  goalContributions: 'id, goalId',
  recurringRules: 'id, isActive, nextRunDate',
  debts: 'id, direction, isSettled',
  debtPayments: 'id, debtId',
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- schemaV5`
Expected: PASS.

- [ ] **Step 6: Full suite (no regressions)**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/db/schema.ts tests/db/schemaV5.test.ts
git commit -m "feat: add debts and debtPayments tables, bump schema to v5"
```

---

### Task D2: debtsRepo (CRUD + payments + progress + totals)

**Files:**
- Create: `src/db/debtsRepo.ts`
- Test: `tests/db/debtsRepo.test.ts`

**Interfaces:**
- Consumes: `db`, `id()`.
- Produces:
  - `createDebt(input: { direction: DebtDirection; person: string; amount: number; currency: string; dueDate?: string; notes?: string }): Promise<Debt>` (sets `isSettled = false`).
  - `updateDebt(id: string, patch: Partial<Debt>): Promise<void>`
  - `deleteDebt(id: string): Promise<void>` — deletes the debt AND its payments.
  - `listDebts(filter?: { direction?: DebtDirection; includeSettled?: boolean }): Promise<Debt[]>`
  - `addPayment(input: { debtId: string; amount: number; date: string; note?: string }): Promise<DebtPayment>`
  - `listPayments(debtId: string): Promise<DebtPayment[]>` newest-first by date.
  - `DebtProgress = { debt: Debt; paid: number; remaining: number; percent: number; settled: boolean }`
  - `debtsWithProgress(filter?: { direction?: DebtDirection; includeSettled?: boolean }): Promise<DebtProgress[]>`
  - `remainingTotalsByDirection(): Promise<{ owe: Record<string, number>; owed: Record<string, number> }>` — sum of `remaining` per direction grouped by currency (settled debts contribute 0).

- [ ] **Step 1: Write the failing test**

`tests/db/debtsRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createDebt, listDebts, updateDebt, deleteDebt, addPayment, listPayments, debtsWithProgress, remainingTotalsByDirection } from '../../src/db/debtsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('debtsRepo', () => {
  it('creates, lists by direction, updates', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    await createDebt({ direction: 'owed', person: 'سارة', amount: 20000, currency: 'EUR' })
    expect((await listDebts({ direction: 'owe' })).map(d => d.id)).toEqual([a.id])
    await updateDebt(a.id, { person: 'أحمد علي' })
    expect((await listDebts({ direction: 'owe' }))[0].person).toBe('أحمد علي')
  })
  it('deletes a debt and its payments', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 10000, date: '2026-06-01' })
    await deleteDebt(a.id)
    expect(await listDebts()).toHaveLength(0)
    expect(await listPayments(a.id)).toHaveLength(0)
  })
  it('tracks payments and progress', async () => {
    const a = await createDebt({ direction: 'owe', person: 'أحمد', amount: 10000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 4000, date: '2026-06-01' })
    await addPayment({ debtId: a.id, amount: 4000, date: '2026-06-05' })
    const [p] = await debtsWithProgress({ direction: 'owe' })
    expect(p.paid).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.settled).toBe(false)
  })
  it('marks settled when fully paid and excludes settled by default', async () => {
    const a = await createDebt({ direction: 'owed', person: 'سارة', amount: 5000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 5000, date: '2026-06-01' })
    const [p] = await debtsWithProgress({ direction: 'owed' })
    expect(p.settled).toBe(true)
    expect(p.remaining).toBe(0)
    expect(await listDebts({ direction: 'owed' })).toHaveLength(1)               // listDebts ignores settled flag unless asked
    expect(await listDebts({ direction: 'owed', includeSettled: false })).toHaveLength(1) // not isSettled (auto-settled only)
  })
  it('handles amount of zero without dividing by zero', async () => {
    await createDebt({ direction: 'owe', person: 'x', amount: 0, currency: 'EUR' })
    const [p] = await debtsWithProgress()
    expect(p.percent).toBe(0)
    expect(p.settled).toBe(false)
  })
  it('sums remaining per direction grouped by currency', async () => {
    const a = await createDebt({ direction: 'owe', person: 'A', amount: 10000, currency: 'EUR' })
    await addPayment({ debtId: a.id, amount: 3000, date: '2026-06-01' })       // remaining 7000 EUR
    await createDebt({ direction: 'owe', person: 'B', amount: 5000, currency: 'USD' }) // remaining 5000 USD
    await createDebt({ direction: 'owed', person: 'C', amount: 2000, currency: 'EUR' }) // remaining 2000 EUR
    const totals = await remainingTotalsByDirection()
    expect(totals.owe).toEqual({ EUR: 7000, USD: 5000 })
    expect(totals.owed).toEqual({ EUR: 2000 })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- debtsRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/debtsRepo.ts`:
```ts
import { db } from './schema'
import { id } from '../lib/uuid'
import type { Debt, DebtPayment, DebtDirection } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateDebtInput {
  direction: DebtDirection
  person: string
  amount: number
  currency: string
  dueDate?: string
  notes?: string
}

export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  const debt: Debt = { id: id(), isSettled: false, createdAt: nowIso(), updatedAt: nowIso(), ...input }
  await db.debts.add(debt)
  return debt
}

export async function updateDebt(debtId: string, patch: Partial<Debt>): Promise<void> {
  await db.debts.update(debtId, { ...patch, updatedAt: nowIso() })
}

export async function deleteDebt(debtId: string): Promise<void> {
  await db.transaction('rw', db.debts, db.debtPayments, async () => {
    await db.debtPayments.where('debtId').equals(debtId).delete()
    await db.debts.delete(debtId)
  })
}

export interface ListDebtsFilter {
  direction?: DebtDirection
  includeSettled?: boolean
}

export async function listDebts(filter: ListDebtsFilter = {}): Promise<Debt[]> {
  let rows = await db.debts.toArray()
  if (filter.direction) rows = rows.filter(d => d.direction === filter.direction)
  if (filter.includeSettled === false) rows = rows.filter(d => !d.isSettled)
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export interface AddPaymentInput {
  debtId: string
  amount: number
  date: string
  note?: string
}

export async function addPayment(input: AddPaymentInput): Promise<DebtPayment> {
  const payment: DebtPayment = { id: id(), createdAt: nowIso(), ...input }
  await db.debtPayments.add(payment)
  return payment
}

export async function listPayments(debtId: string): Promise<DebtPayment[]> {
  const rows = await db.debtPayments.where('debtId').equals(debtId).toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export interface DebtProgress {
  debt: Debt
  paid: number
  remaining: number
  percent: number
  settled: boolean
}

async function paidByDebt(): Promise<Record<string, number>> {
  const payments = await db.debtPayments.toArray()
  const sums: Record<string, number> = {}
  for (const p of payments) sums[p.debtId] = (sums[p.debtId] ?? 0) + p.amount
  return sums
}

export async function debtsWithProgress(filter: ListDebtsFilter = {}): Promise<DebtProgress[]> {
  const [debts, sums] = await Promise.all([listDebts(filter), paidByDebt()])
  return debts.map(debt => {
    const paid = sums[debt.id] ?? 0
    const percent = debt.amount > 0 ? Math.round((paid / debt.amount) * 100) : 0
    const settled = debt.isSettled || (debt.amount > 0 && paid >= debt.amount)
    return { debt, paid, remaining: Math.max(debt.amount - paid, 0), percent, settled }
  })
}

export async function remainingTotalsByDirection(): Promise<{ owe: Record<string, number>; owed: Record<string, number> }> {
  const progress = await debtsWithProgress()
  const totals = { owe: {} as Record<string, number>, owed: {} as Record<string, number> }
  for (const p of progress) {
    const bucket = totals[p.debt.direction]
    bucket[p.debt.currency] = (bucket[p.debt.currency] ?? 0) + p.remaining
  }
  return totals
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- debtsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/debtsRepo.ts tests/db/debtsRepo.test.ts
git commit -m "feat: add debts repository with payments and progress"
```

---

### Task D3: Backup includes debts + payments, accepts v1–v5

**Files:**
- Modify: `src/db/backupRepo.ts`
- Test: `tests/db/backupDebts.test.ts`

**Interfaces:**
- `exportBackup` output now contains `debts` and `debtPayments` (schemaVersion 5).
- `importBackup` accepts `schemaVersion` 1–5; missing arrays `[]`. Replace-all atomic; `INVALID_BACKUP` for malformed; `INCOMPATIBLE_VERSION` for versions outside {1..5}.

- [ ] **Step 1: Write the failing test**

`tests/db/backupDebts.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with debts', () => {
  it('round-trips debts and payments', async () => {
    await db.debts.add({ id: 'd1', direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR', isSettled: false, createdAt: 't', updatedAt: 't' })
    await db.debtPayments.add({ id: 'p1', debtId: 'd1', amount: 10000, date: '2026-06-01', createdAt: 't' })
    const json = await exportBackup()
    const parsed = JSON.parse(json)
    expect(parsed.debts).toHaveLength(1)
    expect(parsed.debtPayments).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.debts.count()).toBe(1)
    expect(await db.debtPayments.count()).toBe(1)
  })
  it('accepts a v4 backup (no debts fields)', async () => {
    const v4 = JSON.stringify({ schemaVersion: 4, exportedAt: 't', accounts: [], categories: [], transactions: [], settings: null, budgets: [], goals: [], goalContributions: [], recurringRules: [] })
    await importBackup(v4)
    expect(await db.debts.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backupDebts`
Expected: FAIL (export lacks debts; version guard rejects 5).

- [ ] **Step 3: Update the implementation**

In `src/db/backupRepo.ts`:
- import `Debt`, `DebtPayment` from `./types`; add `debts: Debt[]` and `debtPayments: DebtPayment[]` to `BackupShape`.
- in `exportBackup`, read `db.debts.toArray()` and `db.debtPayments.toArray()`, include both in the payload.
- in `importBackup`, change the version guard to accept `1..5` (e.g. `if (![1, 2, 3, 4, 5].includes(data.schemaVersion)) throw new Error('INCOMPATIBLE_VERSION')`).
- in the import transaction, add `db.debts` and `db.debtPayments` to the table list (array form), `clear()` both and `bulkAdd(data.debts ?? [])` / `bulkAdd(data.debtPayments ?? [])`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backupDebts backupRecurring backupGoals backupBudgets backupRepo`
Expected: PASS (all backup suites).

- [ ] **Step 5: Commit**

```bash
git add src/db/backupRepo.ts tests/db/backupDebts.test.ts
git commit -m "feat: include debts in backup and accept v1-v5 imports"
```

---

### Task D4: Debts UI (page, debt form, payment form) + settings link

**Files:**
- Create: `src/features/debts/DebtsPage.tsx`, `DebtForm.tsx`, `PaymentForm.tsx`, `DebtBar.tsx`
- Modify: `src/i18n/ar.ts`, `src/App.tsx` (route `/debts`), `src/features/backup/BackupPage.tsx` (link)
- Test: `tests/features/DebtsPage.test.tsx`

**Interfaces:**
- Consumes: `debtsWithProgress`, `createDebt`, `deleteDebt`, `addPayment`, `remainingTotalsByDirection`; `getSettings`; `formatMoney`, `parseAmount`, `isoDate`.
- Produces: a `/debts` page with two sections (عليّ/لي) + a totals summary, an add-debt sheet, a per-debt add-payment sheet, a settled badge, and a settings access link.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings` (add only keys that are missing — `notes`/`amount`/`save`/`delete`/`currency` already exist):
```ts
  debts: 'الديون والقروض',
  owe: 'عليّ',
  owed: 'لي',
  person: 'الشخص',
  addDebt: 'إضافة دين',
  addPayment: 'إضافة دفعة',
  paid: 'المدفوع',
  settled: 'مسوّى ✓',
  dueDate: 'تاريخ الاستحقاق',
```
(Note: `addPayment`/`dueDate`/`remaining` may already exist from goals/recurring — add only the missing keys; never duplicate an object key.)

- [ ] **Step 2: Write the failing test**

`tests/features/DebtsPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createDebt } from '../../src/db/debtsRepo'
import { DebtsPage } from '../../src/features/debts/DebtsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DebtsPage', () => {
  it('lists a debt by person name', async () => {
    await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    render(<MemoryRouter><DebtsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('أحمد')).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- DebtsPage`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the progress bar**

`src/features/debts/DebtBar.tsx`:
```tsx
export function DebtBar({ percent, settled }: { percent: number; settled: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${settled ? 'bg-emerald-600' : 'bg-amber-500'}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Write the debt form**

`src/features/debts/DebtForm.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../db/settingsRepo'
import { createDebt } from '../../db/debtsRepo'
import { parseAmount } from '../../lib/money'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import type { DebtDirection } from '../../db/types'

export function DebtForm({ onDone }: { onDone: () => void }) {
  const [direction, setDirection] = useState<DebtDirection>('owe')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!person.trim()) { setError('اسم الشخص مطلوب'); return }
    try {
      await createDebt({
        direction, person: person.trim(), amount: parseAmount(amount),
        currency: settings?.defaultCurrency ?? 'EUR',
        dueDate: dueDate || undefined, notes: notes || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(['owe', 'owed'] as DebtDirection[]).map((d) => (
          <Button key={d} type="button" variant={direction === d ? 'primary' : 'ghost'} onClick={() => setDirection(d)}>{t(d)}</Button>
        ))}
      </div>
      <Field label={t('person')}>
        <input className="w-full rounded-lg border p-2" value={person} onChange={(e) => setPerson(e.target.value)} />
      </Field>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('dueDate')}>
        <input type="date" className="w-full rounded-lg border p-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="w-full rounded-lg border p-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
```

- [ ] **Step 6: Write the payment form**

`src/features/debts/PaymentForm.tsx`:
```tsx
import { useState } from 'react'
import { addPayment } from '../../db/debtsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function PaymentForm({ debtId, onDone }: { debtId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await addPayment({ debtId, amount: parseAmount(amount), date: isoDate(new Date()), note: note || undefined })
      onDone()
    } catch {
      setError('مبلغ غير صالح')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="w-full rounded-lg border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
```

- [ ] **Step 7: Write the page**

`src/features/debts/DebtsPage.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { debtsWithProgress, deleteDebt, remainingTotalsByDirection } from '../../db/debtsRepo'
import { formatMoney } from '../../lib/money'
import { DebtBar } from './DebtBar'
import { DebtForm } from './DebtForm'
import { PaymentForm } from './PaymentForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'
import type { DebtDirection } from '../../db/types'

export function DebtsPage() {
  const [adding, setAdding] = useState(false)
  const [payTo, setPayTo] = useState<string | null>(null)
  const data = useLiveQuery(async () => {
    const progress = await debtsWithProgress()
    const totals = await remainingTotalsByDirection()
    return { progress, totals }
  }, [], undefined)

  const section = (dir: DebtDirection) => {
    const items = (data?.progress ?? []).filter((p) => p.debt.direction === dir)
    return (
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t(dir)}</h2>
          <span className="text-xs text-gray-500">
            {Object.entries((data?.totals[dir]) ?? {}).map(([cur, amt]) => formatMoney(amt, cur)).join(' · ')}
          </span>
        </div>
        {items.length === 0 && <EmptyState message={t('noData')} />}
        {items.map((p) => (
          <div key={p.debt.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.debt.person}</span>
              <div className="flex items-center gap-3">
                {p.settled && <span className="text-xs text-emerald-600">{t('settled')}</span>}
                <button aria-label={t('delete')} onClick={async () => { if (window.confirm('حذف هذا الدين؟')) await deleteDebt(p.debt.id) }}>🗑</button>
              </div>
            </div>
            <DebtBar percent={p.percent} settled={p.settled} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('paid')}: {formatMoney(p.paid, p.debt.currency)} / {formatMoney(p.debt.amount, p.debt.currency)} ({p.percent}%)</span>
              {p.debt.dueDate && <span>{t('dueDate')}: {p.debt.dueDate}</span>}
            </div>
            <Button variant="ghost" onClick={() => setPayTo(p.debt.id)}>{t('addPayment')}</Button>
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('debts')}</h1>
        <Button onClick={() => setAdding(true)}>{t('addDebt')}</Button>
      </div>
      {section('owe')}
      {section('owed')}
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <DebtForm onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={payTo !== null} onClose={() => setPayTo(null)}>
        {payTo && <PaymentForm debtId={payTo} onDone={() => setPayTo(null)} />}
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 8: Wire route + settings link**

In `src/App.tsx`: import `DebtsPage` and add `<Route path="/debts" element={<DebtsPage />} />` in the `AppShell` group.

In `src/features/backup/BackupPage.tsx`: add a link to the access-links nav block:
```tsx
<Link to="/debts" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('debts')}</Link>
```

- [ ] **Step 9: Run tests + build**

Run: `npm test -- DebtsPage` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/debts src/i18n/ar.ts src/App.tsx src/features/backup/BackupPage.tsx tests/features/DebtsPage.test.tsx
git commit -m "feat: add debts page, debt and payment forms, access link"
```

---

## Self-Review

**Spec coverage:** debts + payments tables + schema v5 (D1) ✓; CRUD + cascade delete + payments + progress/settled + per-direction currency totals (D2) ✓; backup include + v1–v5 (D3) ✓; two-section page (owe/owed) + totals summary + debt/payment forms + settled badge + settings link (D4) ✓.

**Placeholder scan:** none — all steps contain full code.

**Type consistency:** `DebtDirection`/`Debt`/`DebtPayment` defined in D1, used across D2/D3/D4; `DebtProgress`/`debtsWithProgress`/`remainingTotalsByDirection`/`addPayment`/`deleteDebt` consistent; backup table list updated in D3; `DebtBar` props `{percent, settled}` consistent.

**Note on i18n:** `addPayment`/`dueDate`/`remaining`/`notes`/`amount` may already exist — D4 step 1 instructs to add only missing keys (no duplicates).

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
