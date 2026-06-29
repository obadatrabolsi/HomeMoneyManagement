# Goals (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add savings goals with contribution tracking and progress to the existing money manager.

**Architecture:** Two new Dexie tables (`goals`, `goalContributions`; schema bumped v2→v3), a `goalsRepo` (CRUD/archive + contributions + progress), a goals page with goal + contribution forms, a dashboard goals section, and settings-page access links. Backup updated to include the new tables and accept v1/v2/v3.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Zustand, Tailwind (RTL), Vitest + fake-indexeddb.

## Global Constraints

- Money stored as integer minor units (cents); never floats.
- Each goal has its own `currency`; contributions are in that same currency. **No currency conversion.** Contributions do NOT affect account balances in this phase.
- `percent = target>0 ? round(current/target*100) : 0`; `reached = current >= target && target > 0`.
- UI Arabic only, RTL. IDs are `crypto.randomUUID()` strings.
- Fully offline; no network calls.
- Schema upgrade to version 3 must preserve existing v1/v2 data (additive only).
- TDD for all logic; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task G1: Goal + GoalContribution types + Dexie schema v3

**Files:**
- Modify: `src/db/types.ts`, `src/db/schema.ts`
- Test: `tests/db/schemaV3.test.ts`

**Interfaces:**
- Produces: `Goal`, `GoalContribution` types; `db.goals`, `db.goalContributions` tables; `SCHEMA_VERSION = 3`.

- [ ] **Step 1: Write the failing test**

`tests/db/schemaV3.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'

beforeEach(async () => { await db.delete(); await db.open() })

describe('schema v3', () => {
  it('is version 3 and exposes goals + goalContributions', () => {
    expect(SCHEMA_VERSION).toBe(3)
    expect(db.goals).toBeTruthy()
    expect(db.goalContributions).toBeTruthy()
  })
  it('round-trips a goal and a contribution', async () => {
    await db.goals.add({ id: 'g1', name: 'سفر', targetAmount: 100000, currency: 'EUR', icon: 'plane', color: '#1', isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' })
    await db.goalContributions.add({ id: 'c1', goalId: 'g1', amount: 5000, date: '2026-06-01', createdAt: 't' })
    expect((await db.goals.get('g1'))?.name).toBe('سفر')
    expect((await db.goalContributions.get('c1'))?.amount).toBe(5000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- schemaV3`
Expected: FAIL (`SCHEMA_VERSION` is 2 / tables undefined).

- [ ] **Step 3: Add the types**

In `src/db/types.ts` add:
```ts
export interface Goal {
  id: string
  name: string
  targetAmount: number // cents
  currency: string
  targetDate?: string // yyyy-MM-dd
  notes?: string
  icon: string
  color: string
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface GoalContribution {
  id: string
  goalId: string
  amount: number // cents, may be negative
  date: string // yyyy-MM-dd
  note?: string
  createdAt: string
}
```

- [ ] **Step 4: Bump the schema**

In `src/db/schema.ts`:
- import `Goal`, `GoalContribution` from `./types`.
- change `SCHEMA_VERSION = 2` to `= 3`.
- add fields `goals!: Table<Goal, string>` and `goalContributions!: Table<GoalContribution, string>` to `MoneyDB`.
- keep the existing `this.version(1)` and `this.version(2)` blocks, and ADD:
```ts
this.version(3).stores({
  accounts: 'id, isArchived, sortOrder',
  categories: 'id, type, parentId, isArchived',
  transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
  settings: 'id',
  budgets: 'id, categoryId, month, [month+currency]',
  goals: 'id, isArchived, sortOrder',
  goalContributions: 'id, goalId',
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- schemaV3`
Expected: PASS.

- [ ] **Step 6: Full suite (no regressions from the bump)**

Run: `npm test`
Expected: all PASS (settingsRepo seeds `schemaVersion` from the constant; its test reads the constant).

- [ ] **Step 7: Commit**

```bash
git add src/db/types.ts src/db/schema.ts tests/db/schemaV3.test.ts
git commit -m "feat: add goals and goalContributions tables, bump schema to v3"
```

---

### Task G2: goalsRepo (CRUD/archive + contributions + progress)

**Files:**
- Create: `src/db/goalsRepo.ts`
- Test: `tests/db/goalsRepo.test.ts`

**Interfaces:**
- Consumes: `db`, `id()`.
- Produces:
  - `createGoal(input: { name: string; targetAmount: number; currency: string; targetDate?: string; notes?: string; icon?: string; color?: string }): Promise<Goal>` (defaults: icon `'target'`, color `'#10b981'`, sortOrder = current count, isArchived false).
  - `updateGoal(id: string, patch: Partial<Goal>): Promise<void>`
  - `archiveGoal(id: string): Promise<void>`
  - `listGoals(includeArchived?: boolean): Promise<Goal[]>` sorted by `sortOrder`.
  - `addContribution(input: { goalId: string; amount: number; date: string; note?: string }): Promise<GoalContribution>`
  - `listContributions(goalId: string): Promise<GoalContribution[]>` newest-first by date.
  - `GoalProgress = { goal: Goal; current: number; remaining: number; percent: number; reached: boolean }`
  - `goalsWithProgress(includeArchived?: boolean): Promise<GoalProgress[]>` — `current` = sum of the goal's contributions; `percent = target>0 ? round(current/target*100) : 0`; `reached = current >= target && target > 0`; `remaining = Math.max(target - current, 0)`.

- [ ] **Step 1: Write the failing test**

`tests/db/goalsRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createGoal, listGoals, updateGoal, archiveGoal, addContribution, listContributions, goalsWithProgress } from '../../src/db/goalsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('goalsRepo', () => {
  it('creates, lists, updates, archives', async () => {
    const g = await createGoal({ name: 'سفر', targetAmount: 100000, currency: 'EUR' })
    expect((await listGoals()).map(x => x.id)).toEqual([g.id])
    await updateGoal(g.id, { name: 'رحلة' })
    expect((await listGoals())[0].name).toBe('رحلة')
    await archiveGoal(g.id)
    expect(await listGoals()).toHaveLength(0)
    expect(await listGoals(true)).toHaveLength(1)
  })
  it('tracks contributions (positive and negative) and progress', async () => {
    const g = await createGoal({ name: 'طوارئ', targetAmount: 10000, currency: 'EUR' })
    await addContribution({ goalId: g.id, amount: 8000, date: '2026-06-01' })
    await addContribution({ goalId: g.id, amount: 1000, date: '2026-06-05' })
    await addContribution({ goalId: g.id, amount: -1000, date: '2026-06-06' }) // withdrawal
    expect((await listContributions(g.id)).length).toBe(3)
    const [p] = await goalsWithProgress()
    expect(p.current).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.reached).toBe(false)
  })
  it('marks reached when current meets or exceeds target', async () => {
    const g = await createGoal({ name: 'لابتوب', targetAmount: 5000, currency: 'EUR' })
    await addContribution({ goalId: g.id, amount: 5000, date: '2026-06-01' })
    const [p] = await goalsWithProgress()
    expect(p.reached).toBe(true)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(0)
  })
  it('handles target of zero without dividing by zero', async () => {
    await createGoal({ name: 'بلا هدف', targetAmount: 0, currency: 'EUR' })
    const [p] = await goalsWithProgress()
    expect(p.percent).toBe(0)
    expect(p.reached).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- goalsRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/goalsRepo.ts`:
```ts
import { db } from './schema'
import { id } from '../lib/uuid'
import type { Goal, GoalContribution } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateGoalInput {
  name: string
  targetAmount: number
  currency: string
  targetDate?: string
  notes?: string
  icon?: string
  color?: string
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const count = await db.goals.count()
  const goal: Goal = {
    id: id(),
    name: input.name,
    targetAmount: input.targetAmount,
    currency: input.currency,
    targetDate: input.targetDate,
    notes: input.notes,
    icon: input.icon ?? 'target',
    color: input.color ?? '#10b981',
    isArchived: false,
    sortOrder: count,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.goals.add(goal)
  return goal
}

export async function updateGoal(goalId: string, patch: Partial<Goal>): Promise<void> {
  await db.goals.update(goalId, { ...patch, updatedAt: nowIso() })
}

export async function archiveGoal(goalId: string): Promise<void> {
  await db.goals.update(goalId, { isArchived: true, updatedAt: nowIso() })
}

export async function listGoals(includeArchived = false): Promise<Goal[]> {
  const rows = await db.goals.toArray()
  return rows
    .filter(g => includeArchived || !g.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

export interface AddContributionInput {
  goalId: string
  amount: number
  date: string
  note?: string
}

export async function addContribution(input: AddContributionInput): Promise<GoalContribution> {
  const c: GoalContribution = { id: id(), createdAt: nowIso(), ...input }
  await db.goalContributions.add(c)
  return c
}

export async function listContributions(goalId: string): Promise<GoalContribution[]> {
  const rows = await db.goalContributions.where('goalId').equals(goalId).toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export interface GoalProgress {
  goal: Goal
  current: number
  remaining: number
  percent: number
  reached: boolean
}

export async function goalsWithProgress(includeArchived = false): Promise<GoalProgress[]> {
  const [goals, contributions] = await Promise.all([
    listGoals(includeArchived),
    db.goalContributions.toArray(),
  ])
  const sums: Record<string, number> = {}
  for (const c of contributions) sums[c.goalId] = (sums[c.goalId] ?? 0) + c.amount
  return goals.map(goal => {
    const current = sums[goal.id] ?? 0
    const percent = goal.targetAmount > 0 ? Math.round((current / goal.targetAmount) * 100) : 0
    const reached = goal.targetAmount > 0 && current >= goal.targetAmount
    return { goal, current, remaining: Math.max(goal.targetAmount - current, 0), percent, reached }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- goalsRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/goalsRepo.ts tests/db/goalsRepo.test.ts
git commit -m "feat: add goals repository with contributions and progress"
```

---

### Task G3: Backup includes goals + contributions, accepts v1/v2/v3

**Files:**
- Modify: `src/db/backupRepo.ts`
- Test: `tests/db/backupGoals.test.ts`

**Interfaces:**
- `exportBackup` output now contains `goals` and `goalContributions` arrays (schemaVersion 3).
- `importBackup` accepts `schemaVersion` 1, 2, or 3; missing arrays treated as `[]`. Replace-all atomic; `INVALID_BACKUP` for malformed JSON; `INCOMPATIBLE_VERSION` for versions outside {1,2,3}.

- [ ] **Step 1: Write the failing test**

`tests/db/backupGoals.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { exportBackup, importBackup } from '../../src/db/backupRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('backup with goals', () => {
  it('round-trips goals and contributions', async () => {
    await db.goals.add({ id: 'g1', name: 'سفر', targetAmount: 100000, currency: 'EUR', icon: 'target', color: '#1', isArchived: false, sortOrder: 0, createdAt: 't', updatedAt: 't' })
    await db.goalContributions.add({ id: 'c1', goalId: 'g1', amount: 5000, date: '2026-06-01', createdAt: 't' })
    const json = await exportBackup()
    const parsed = JSON.parse(json)
    expect(parsed.goals).toHaveLength(1)
    expect(parsed.goalContributions).toHaveLength(1)
    await db.delete(); await db.open()
    await importBackup(json)
    expect(await db.goals.count()).toBe(1)
    expect(await db.goalContributions.count()).toBe(1)
  })
  it('accepts a v2 backup (no goals fields) and imports zero goals', async () => {
    const v2 = JSON.stringify({
      schemaVersion: 2, exportedAt: 't',
      accounts: [], categories: [], transactions: [], settings: null, budgets: [],
    })
    await importBackup(v2)
    expect(await db.goals.count()).toBe(0)
  })
  it('still rejects an unsupported version', async () => {
    const bad = JSON.stringify({ schemaVersion: 999, accounts: [], categories: [], transactions: [], settings: null })
    await expect(importBackup(bad)).rejects.toThrow('INCOMPATIBLE_VERSION')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- backupGoals`
Expected: FAIL (export lacks goals; v2/v3 acceptance not yet present).

- [ ] **Step 3: Update the implementation**

In `src/db/backupRepo.ts`:
- import `Goal`, `GoalContribution` from `./types`; add `goals: Goal[]` and `goalContributions: GoalContribution[]` to `BackupShape`.
- in `exportBackup`, also read `db.goals.toArray()` and `db.goalContributions.toArray()`, include both in the payload.
- in `importBackup`, change the version guard to accept `1, 2, 3` (e.g. `if (![1, 2, 3].includes(data.schemaVersion)) throw new Error('INCOMPATIBLE_VERSION')`).
- in the import transaction, add `db.goals` and `db.goalContributions` to the table list; `clear()` both and `bulkAdd(data.goals ?? [])` / `bulkAdd(data.goalContributions ?? [])`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- backupGoals backupBudgets backupRepo`
Expected: PASS (all three — earlier backup tests still pass).

- [ ] **Step 5: Commit**

```bash
git add src/db/backupRepo.ts tests/db/backupGoals.test.ts
git commit -m "feat: include goals in backup and accept v1/v2/v3 imports"
```

---

### Task G4: Goals UI (page, goal form, contribution form) + access links

**Files:**
- Create: `src/features/goals/GoalsPage.tsx`, `GoalForm.tsx`, `ContributionForm.tsx`, `GoalBar.tsx`
- Modify: `src/i18n/ar.ts` (goal keys), `src/App.tsx` (route `/goals`), `src/features/backup/BackupPage.tsx` (access links)
- Test: `tests/features/GoalsPage.test.tsx`

**Interfaces:**
- Consumes: `goalsWithProgress`, `createGoal`, `archiveGoal`, `addContribution` (G2); `getSettings`; `formatMoney`, `parseAmount`; `isoDate`.
- Produces: a `/goals` page listing active goals with progress bars, an add-goal sheet, a per-goal "add contribution" sheet, an archive action, and a "reached" badge. Plus access links on the settings page to /goals, /budgets, /categories.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings`:
```ts
  goals: 'الأهداف',
  addGoal: 'إضافة هدف',
  targetAmount: 'المبلغ المستهدف',
  targetDate: 'تاريخ الإنجاز',
  current: 'الحالي',
  addContribution: 'إضافة مبلغ',
  reached: 'تم الإنجاز ✓',
  more: 'المزيد',
```

- [ ] **Step 2: Write the failing test**

`tests/features/GoalsPage.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createGoal } from '../../src/db/goalsRepo'
import { GoalsPage } from '../../src/features/goals/GoalsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('GoalsPage', () => {
  it('lists active goals by name', async () => {
    await createGoal({ name: 'صندوق الطوارئ', targetAmount: 100000, currency: 'EUR' })
    render(<MemoryRouter><GoalsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('صندوق الطوارئ')).toBeInTheDocument())
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- GoalsPage`
Expected: FAIL (module not found).

- [ ] **Step 4: Write the progress bar**

`src/features/goals/GoalBar.tsx`:
```tsx
export function GoalBar({ percent, reached }: { percent: number; reached: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${reached ? 'bg-emerald-600' : 'bg-sky-500'}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
```

- [ ] **Step 5: Write the goal form**

`src/features/goals/GoalForm.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../db/settingsRepo'
import { createGoal } from '../../db/goalsRepo'
import { parseAmount } from '../../lib/money'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function GoalForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('الاسم مطلوب'); return }
    try {
      await createGoal({
        name: name.trim(),
        targetAmount: parseAmount(target || '0'),
        currency: settings?.defaultCurrency ?? 'EUR',
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('name')}>
        <input className="w-full rounded-lg border p-2" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('targetAmount')}>
        <input aria-label={t('targetAmount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <Field label={t('targetDate')}>
        <input type="date" className="w-full rounded-lg border p-2" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
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

- [ ] **Step 6: Write the contribution form**

`src/features/goals/ContributionForm.tsx`:
```tsx
import { useState } from 'react'
import { addContribution } from '../../db/goalsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function ContributionForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await addContribution({ goalId, amount: parseAmount(amount), date: isoDate(new Date()), note: note || undefined })
      onDone()
    } catch {
      setError('مبلغ غير صالح')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
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

`src/features/goals/GoalsPage.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { goalsWithProgress, archiveGoal } from '../../db/goalsRepo'
import { formatMoney } from '../../lib/money'
import { GoalBar } from './GoalBar'
import { GoalForm } from './GoalForm'
import { ContributionForm } from './ContributionForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function GoalsPage() {
  const [adding, setAdding] = useState(false)
  const [contributeTo, setContributeTo] = useState<string | null>(null)
  const goals = useLiveQuery(() => goalsWithProgress(), [], [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('goals')}</h1>
        <Button onClick={() => setAdding(true)}>{t('addGoal')}</Button>
      </div>
      {goals.length === 0 && <EmptyState message={t('noData')} />}
      {goals.map((p) => (
        <div key={p.goal.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="font-medium" style={{ color: p.goal.color }}>{p.goal.name}</span>
            <div className="flex items-center gap-3">
              {p.reached && <span className="text-xs text-emerald-600">{t('reached')}</span>}
              <button aria-label={t('archive')} onClick={() => archiveGoal(p.goal.id)}>🗑</button>
            </div>
          </div>
          <GoalBar percent={p.percent} reached={p.reached} />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('current')}: {formatMoney(p.current, p.goal.currency)} / {formatMoney(p.goal.targetAmount, p.goal.currency)} ({p.percent}%)</span>
            {p.goal.targetDate && <span>{t('targetDate')}: {p.goal.targetDate}</span>}
          </div>
          <Button variant="ghost" onClick={() => setContributeTo(p.goal.id)}>{t('addContribution')}</Button>
        </div>
      ))}
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <GoalForm onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={contributeTo !== null} onClose={() => setContributeTo(null)}>
        {contributeTo && <ContributionForm goalId={contributeTo} onDone={() => setContributeTo(null)} />}
      </Sheet>
    </div>
  )
}
```

- [ ] **Step 8: Wire route + settings access links**

In `src/App.tsx`: import `GoalsPage` from `./features/goals/GoalsPage` and add `<Route path="/goals" element={<GoalsPage />} />` in the `AppShell` route group.

In `src/features/backup/BackupPage.tsx`: at the top of the returned page (under the `<h1>`), add an access-links block (uses `Link` from `react-router-dom` — add the import):
```tsx
<nav className="flex flex-wrap gap-2">
  <Link to="/goals" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('goals')}</Link>
  <Link to="/budgets" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('budgets')}</Link>
  <Link to="/categories" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('categories')}</Link>
</nav>
```

- [ ] **Step 9: Run tests + build**

Run: `npm test -- GoalsPage` then `npm run build`
Expected: PASS; build compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 10: Commit**

```bash
git add src/features/goals src/i18n/ar.ts src/App.tsx src/features/backup/BackupPage.tsx tests/features/GoalsPage.test.tsx
git commit -m "feat: add goals page, goal and contribution forms, access links"
```

---

### Task G5: Dashboard goals section

**Files:**
- Modify: `src/features/dashboard/DashboardPage.tsx`
- Test: `tests/features/DashboardGoals.test.tsx`

**Interfaces:**
- Consumes: `goalsWithProgress`, `GoalBar`, `Link`.
- Produces: a "الأهداف" section on the dashboard showing up to 3 active goals with progress bars + a "عرض الكل" link to `/goals`, rendered only when at least one goal exists, placed after the budgets section (before recent transactions).

- [ ] **Step 1: Write the failing test**

`tests/features/DashboardGoals.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createGoal } from '../../src/db/goalsRepo'
import { DashboardPage } from '../../src/features/dashboard/DashboardPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DashboardPage goals section', () => {
  it('shows the goals heading when a goal exists', async () => {
    await createGoal({ name: 'سفر', targetAmount: 100000, currency: 'EUR' })
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('الأهداف')).toBeInTheDocument())
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- DashboardGoals`
Expected: FAIL (no goals heading yet).

- [ ] **Step 3: Update the dashboard**

In `src/features/dashboard/DashboardPage.tsx`:
- import `{ goalsWithProgress }` from `../../db/goalsRepo`, `{ GoalBar }` from `../goals/GoalBar` (`Link` is already imported from the budgets section).
- in the `useLiveQuery`, compute `const goals = (await goalsWithProgress()).slice(0, 3)` and return it in the result object.
- render a new section AFTER the budgets section and BEFORE the recent-transactions section, only when `data.goals.length > 0`:
```tsx
{data.goals.length > 0 && (
  <section className="space-y-2 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
    <div className="flex items-center justify-between">
      <h2 className="text-sm text-gray-500">{t('goals')}</h2>
      <Link to="/goals" className="text-xs text-emerald-600">{t('viewAll')}</Link>
    </div>
    {data.goals.map((p) => (
      <div key={p.goal.id} className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>{p.goal.name}</span>
          <span className="text-gray-500">{p.percent}%</span>
        </div>
        <GoalBar percent={p.percent} reached={p.reached} />
      </div>
    ))}
  </section>
)}
```

- [ ] **Step 4: Run tests + build**

Run: `npm test -- DashboardGoals DashboardPage DashboardBudgets` then `npm run build`
Expected: PASS (existing dashboard tests still pass); build compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/dashboard/DashboardPage.tsx tests/features/DashboardGoals.test.tsx
git commit -m "feat: show goals progress on the dashboard"
```

---

## Self-Review

**Spec coverage:** goals + contributions tables + schema v3 (G1) ✓; CRUD/archive + contributions (±) + progress/reached/target=0 (G2) ✓; backup include + v1/v2/v3 (G3) ✓; goals page + goal/contribution forms + reached badge + settings access links fixing categories orphan (G4) ✓; dashboard "الأهداف" section (G5) ✓.

**Placeholder scan:** none — all steps contain full code.

**Type consistency:** `GoalProgress` defined in G2, consumed in G4/G5; `goalsWithProgress`/`addContribution`/`archiveGoal` names consistent; backup table list updated in G3; `GoalBar` props `{percent, reached}` consistent across G4/G5.

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
