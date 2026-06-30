# Data Export/Import (Phase 3A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users export transactions to CSV, import transactions from CSV, and save reports as PDF via the browser print dialog — all client-side, offline.

**Architecture:** A pure `csv` lib (`toCsv`/`parseCsv`), a `dataPortRepo` (`transactionsToCsv` + `importTransactionsCsv` over existing repos), CSV export/import controls on the settings page, a "Save PDF" print button on the reports page, and a print stylesheet that hides app chrome.

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Tailwind (RTL), Vitest + fake-indexeddb. No new dependencies.

## Global Constraints

- Money stored as integer minor units (cents); CSV amounts are major units (e.g. `12.50`).
- CSV is UTF-8 with a BOM; RFC 4180 quoting (quote fields containing `, " \n`, double inner quotes).
- Export columns (header row, exact order): `date,type,amount,currency,account,category,merchant,notes,tags`. Tags joined by `|`.
- Import handles `income`/`expense` only; `transfer` rows are skipped. Account matched by name to an existing account (skip row if not found). Category matched by name (optional; blank/unknown → no category).
- No new Dexie tables, no schema bump, no backup change.
- UI must match the current redesigned conventions: use `Card` and `Button` from `src/components/ui/`, the design tokens (`text-ink`, `text-muted`, `bg-surface-2`, etc.), and the existing `t()` i18n. Read `src/features/backup/BackupPage.tsx` for the current style before writing UI.
- The repo has an active `.githooks/pre-commit` that auto-bumps `package.json` version on every commit and `git add package.json` — this is expected; let it run. When committing, stage ONLY your task's files with explicit paths (`git add <paths>`), never `git add -A` (the tree contains another session's uncommitted tooling under `scripts/` that must stay untracked).
- TDD for the libs/repo; tests use `fake-indexeddb`.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task DP1: CSV library (toCsv + parseCsv)

**Files:**
- Create: `src/lib/csv.ts`
- Test: `tests/lib/csv.test.ts`

**Interfaces:**
- Produces:
  - `toCsv(rows: string[][]): string` — RFC 4180; fields containing `,`, `"`, `\n`, or `\r` are wrapped in double quotes with inner `"` doubled; rows joined by `\r\n`.
  - `parseCsv(text: string): string[][]` — parses RFC 4180 (quoted fields may contain commas/newlines/escaped quotes); strips a leading UTF-8 BOM; ignores a trailing empty line.

- [ ] **Step 1: Write the failing test**

`tests/lib/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { toCsv, parseCsv } from '../../src/lib/csv'

describe('csv', () => {
  it('builds simple rows', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })
  it('quotes fields with commas, quotes, and newlines', () => {
    expect(toCsv([['x,y', 'he said "hi"', 'line1\nline2']]))
      .toBe('"x,y","he said ""hi""","line1\nline2"')
  })
  it('parses simple rows', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('parses quoted fields with commas, escaped quotes, and newlines', () => {
    expect(parseCsv('"x,y","he said ""hi""","line1\nline2"'))
      .toEqual([['x,y', 'he said "hi"', 'line1\nline2']])
  })
  it('strips a BOM and ignores a trailing newline', () => {
    expect(parseCsv('﻿a,b\r\n')).toEqual([['a', 'b']])
  })
  it('round-trips', () => {
    const rows = [['date', 'notes'], ['2026-06-01', 'café, "x"\nnext']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- csv`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/lib/csv.ts`:
```ts
function escapeField(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

export function parseCsv(text: string): string[][] {
  let s = text
  if (s.charCodeAt(0) === 0xfeff) s = s.slice(1) // strip BOM
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += c; i++; continue
    }
    if (c === '"') { inQuotes = true; i++; continue }
    if (c === ',') { row.push(field); field = ''; i++; continue }
    if (c === '\r') { i++; continue }
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue }
    field += c; i++
  }
  // flush last field/row unless it's a trailing empty line
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- csv`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv.ts tests/lib/csv.test.ts
git commit -m "feat: add RFC4180 CSV encode/parse library"
```

---

### Task DP2: dataPortRepo (CSV export/import of transactions)

**Files:**
- Create: `src/db/dataPortRepo.ts`
- Test: `tests/db/dataPortRepo.test.ts`

**Interfaces:**
- Consumes: `db`, `toCsv`/`parseCsv` (DP1), `createTransaction` from `./transactionsRepo`, `fromCents`/`toCents` from `../lib/money`.
- Produces:
  - `CSV_HEADER = ['date','type','amount','currency','account','category','merchant','notes','tags']`
  - `transactionsToCsv(): Promise<string>` — header + a row per non-deleted transaction; amount via `fromCents` formatted as a plain decimal string; account/category resolved to names (archived included); tags joined by `|`; prefixed with a UTF-8 BOM (`'﻿'`).
  - `ImportResult = { imported: number; skipped: number; errors: string[] }`
  - `importTransactionsCsv(text: string): Promise<ImportResult>` — parses; expects the header row; for each data row: skip `transfer`; require `type` ∈ {income,expense}, a parseable positive `amount`, and an `account` name matching an existing account (else skip with an error message); resolve `category` by name (optional); insert via `createTransaction` with the row's `date`. Counts imported/skipped and collects short error strings.

- [ ] **Step 1: Write the failing test**

`tests/db/dataPortRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createCategory } from '../../src/db/categoriesRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { transactionsToCsv, importTransactionsCsv, CSV_HEADER } from '../../src/db/dataPortRepo'

let accId = '', catId = ''
beforeEach(async () => {
  await db.delete(); await db.open()
  accId = (await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })).id
  catId = (await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })).id
})

describe('dataPortRepo export', () => {
  it('exports a BOM + header + one row per transaction with names and major-unit amount', async () => {
    await createTransaction({ type: 'expense', amount: 1250, accountId: accId, categoryId: catId, date: '2026-06-01', merchant: 'مقهى' })
    const csv = await transactionsToCsv()
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    const lines = csv.slice(1).split('\r\n')
    expect(lines[0]).toBe(CSV_HEADER.join(','))
    expect(lines[1]).toContain('2026-06-01')
    expect(lines[1]).toContain('expense')
    expect(lines[1]).toContain('12.5')
    expect(lines[1]).toContain('نقد')
    expect(lines[1]).toContain('الطعام')
    expect(lines[1]).toContain('مقهى')
  })
})

describe('dataPortRepo import', () => {
  it('imports income/expense rows by account/category name', async () => {
    const csv = '﻿' + CSV_HEADER.join(',') + '\r\n' +
      ['2026-06-02', 'expense', '5.00', 'EUR', 'نقد', 'الطعام', 'مطعم', 'غداء', ''].join(',') + '\r\n' +
      ['2026-06-03', 'income', '100', 'EUR', 'نقد', '', '', '', ''].join(',')
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(2)
    expect(res.skipped).toBe(0)
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(2)
    expect(txs.find(t => t.type === 'expense')?.amount).toBe(500)
  })
  it('skips transfer rows and rows whose account does not exist', async () => {
    const csv = CSV_HEADER.join(',') + '\r\n' +
      ['2026-06-02', 'transfer', '5.00', 'EUR', 'نقد', '', '', '', ''].join(',') + '\r\n' +
      ['2026-06-02', 'expense', '5.00', 'EUR', 'غير موجود', '', '', '', ''].join(',')
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(0)
    expect(res.skipped).toBe(2)
    expect(res.errors.length).toBe(2)
  })
  it('round-trips export then import', async () => {
    await createTransaction({ type: 'expense', amount: 1250, accountId: accId, categoryId: catId, date: '2026-06-01', merchant: 'مقهى' })
    const csv = await transactionsToCsv()
    await db.transactions.clear()
    const res = await importTransactionsCsv(csv)
    expect(res.imported).toBe(1)
    expect((await db.transactions.toArray())[0].amount).toBe(1250)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dataPortRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/db/dataPortRepo.ts`:
```ts
import { db } from './schema'
import { toCsv, parseCsv } from '../lib/csv'
import { createTransaction } from './transactionsRepo'
import { fromCents, parseAmount } from '../lib/money'
import type { Transaction } from './types'

export const CSV_HEADER = ['date', 'type', 'amount', 'currency', 'account', 'category', 'merchant', 'notes', 'tags']

export async function transactionsToCsv(): Promise<string> {
  const [accounts, categories, txs] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
  ])
  const accName: Record<string, string> = {}
  for (const a of accounts) accName[a.id] = a.name
  const catName: Record<string, string> = {}
  for (const c of categories) catName[c.id] = c.name

  const rows: string[][] = [CSV_HEADER]
  for (const t of txs.filter((x) => !x.deletedAt)) {
    rows.push([
      t.date,
      t.type,
      String(fromCents(t.amount)),
      accName[t.accountId] ? '' : '', // currency placeholder set below
      accName[t.accountId] ?? '',
      t.categoryId ? (catName[t.categoryId] ?? '') : '',
      t.merchant ?? '',
      t.notes ?? '',
      (t.tags ?? []).join('|'),
    ])
  }
  // fill currency column (index 3) from the account
  const accCurrency: Record<string, string> = {}
  for (const a of accounts) accCurrency[a.id] = a.currency
  for (let i = 1; i < rows.length; i++) {
    const t = txs.filter((x) => !x.deletedAt)[i - 1]
    rows[i][3] = accCurrency[t.accountId] ?? ''
  }
  return '﻿' + toCsv(rows)
}

export interface ImportResult {
  imported: number
  skipped: number
  errors: string[]
}

export async function importTransactionsCsv(text: string): Promise<ImportResult> {
  const rows = parseCsv(text)
  const result: ImportResult = { imported: 0, skipped: 0, errors: [] }
  if (rows.length === 0) return result

  const header = rows[0].map((h) => h.trim())
  const idx = (name: string) => header.indexOf(name)
  const di = idx('date'), ti = idx('type'), ai = idx('amount'),
    acc = idx('account'), cat = idx('category'), mer = idx('merchant'),
    note = idx('notes'), tag = idx('tags')

  const accounts = await db.accounts.toArray()
  const categories = await db.categories.toArray()
  const accByName: Record<string, string> = {}
  for (const a of accounts) accByName[a.name] = a.id
  const catByName: Record<string, string> = {}
  for (const c of categories) catByName[c.name] = c.id

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length === 1 && row[0] === '') continue // blank line
    const type = (row[ti] ?? '').trim()
    if (type === 'transfer') { result.skipped++; result.errors.push(`سطر ${r + 1}: تحويل (متجاهل)`); continue }
    if (type !== 'income' && type !== 'expense') { result.skipped++; result.errors.push(`سطر ${r + 1}: نوع غير صالح`); continue }
    const accountId = accByName[(row[acc] ?? '').trim()]
    if (!accountId) { result.skipped++; result.errors.push(`سطر ${r + 1}: حساب غير موجود`); continue }
    let cents: number
    try { cents = parseAmount(row[ai] ?? '') } catch { result.skipped++; result.errors.push(`سطر ${r + 1}: مبلغ غير صالح`); continue }
    if (!(cents > 0)) { result.skipped++; result.errors.push(`سطر ${r + 1}: مبلغ غير صالح`); continue }
    const categoryId = cat >= 0 ? catByName[(row[cat] ?? '').trim()] : undefined
    const tags = tag >= 0 && row[tag] ? row[tag].split('|').filter(Boolean) : []
    await createTransaction({
      type,
      amount: cents,
      accountId,
      categoryId,
      date: (row[di] ?? '').trim(),
      merchant: mer >= 0 ? (row[mer] || undefined) : undefined,
      notes: note >= 0 ? (row[note] || undefined) : undefined,
      tags,
    })
    result.imported++
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dataPortRepo`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/dataPortRepo.ts tests/db/dataPortRepo.test.ts
git commit -m "feat: add CSV export/import of transactions"
```

---

### Task DP3: UI — CSV export/import + PDF print + print stylesheet

**Files:**
- Modify: `src/features/backup/BackupPage.tsx` (CSV export/import card), `src/features/reports/ReportsPage.tsx` (Save-PDF button), `src/index.css` (print styles), `src/i18n/ar.ts` (keys)
- Test: `tests/features/DataPort.test.tsx`

**Interfaces:**
- Consumes: `transactionsToCsv`, `importTransactionsCsv` (DP2); existing `Card`/`Button`/`Field` UI; `t()`.
- Produces: an "export/import CSV" card on the settings page (download + file picker + import-result message), a "Save PDF" button on the reports page that calls `window.print()`, and a print stylesheet hiding nav/FAB.

> Read `src/features/backup/BackupPage.tsx`, `src/features/reports/ReportsPage.tsx`, and the components under `src/components/ui/` FIRST to match the current redesigned conventions (Card, Button, design tokens like `text-ink`/`text-muted`/`bg-surface-2`). Mirror the existing JSON export/import block's structure for the CSV one.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings` (add only missing keys):
```ts
  exportCsv: 'تصدير CSV',
  importCsv: 'استيراد CSV',
  savePdf: 'حفظ PDF',
  dataPort: 'تصدير/استيراد البيانات',
  imported: 'تم الاستيراد',
  skipped: 'تم التجاهل',
```

- [ ] **Step 2: Write the failing test**

`tests/features/DataPort.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DataPort UI', () => {
  it('shows CSV export and import controls on the settings page', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByText('تصدير CSV')).toBeInTheDocument()
    expect(screen.getByText('استيراد CSV')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- DataPort`
Expected: FAIL (controls not present yet).

- [ ] **Step 4: Add the CSV export/import card to BackupPage**

In `src/features/backup/BackupPage.tsx`, add a `Card` (titled `t('dataPort')`) with:
- an "export CSV" `Button` whose handler calls `transactionsToCsv()`, builds a `Blob` (`type: 'text/csv;charset=utf-8'`), and triggers a download named `transactions-<yyyy-MM-dd>.csv` (mirror the existing JSON `doExport` download logic).
- an "import CSV" file `<label>`/`<input type="file" accept=".csv,text/csv">` whose handler reads the file text, calls `importTransactionsCsv(text)`, and shows the result via `window.alert(\`${t('imported')}: ${res.imported} · ${t('skipped')}: ${res.skipped}\`)`. Reset the input after.
Use a local `useState` for an optional inline result message if you prefer over `alert`, but `alert` is acceptable and matches the existing JSON import.

- [ ] **Step 5: Add the Save-PDF button to ReportsPage**

In `src/features/reports/ReportsPage.tsx`, add a `Button` (or a small link styled button) labelled `t('savePdf')` near the page heading with `onClick={() => window.print()}`. Give it a `className` including `no-print` so the button itself doesn't appear in the printout.

- [ ] **Step 6: Add print styles**

Append to `src/index.css`:
```css
@media print {
  nav, .no-print, [data-fab] { display: none !important; }
  body { background: #fff; }
}
```
If the bottom navigation/FAB are not already reachable via `nav`/`[data-fab]`/`.no-print`, add a `no-print` class (or `data-fab`) to those elements in the app shell so they are hidden when printing.

- [ ] **Step 7: Run tests + build**

Run: `npm test -- DataPort` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/backup/BackupPage.tsx src/features/reports/ReportsPage.tsx src/index.css src/i18n/ar.ts tests/features/DataPort.test.tsx
git commit -m "feat: add CSV export/import controls and PDF print"
```

---

## Self-Review

**Spec coverage:** CSV encode/parse (DP1) ✓; transactions CSV export + import with transfer/missing-account skipping and result counts (DP2) ✓; settings-page CSV controls + reports Save-PDF + print stylesheet + i18n (DP3) ✓. No schema/backup change ✓.

**Placeholder scan:** none — DP1/DP2 contain full code; DP3 gives concrete integration steps and points at the existing JSON block to mirror.

**Type consistency:** `CSV_HEADER`/`ImportResult`/`transactionsToCsv`/`importTransactionsCsv` defined in DP2 and consumed in DP3; `toCsv`/`parseCsv` from DP1 used in DP2.

---

## Execution Handoff

Plan complete. Execute via superpowers:subagent-driven-development (fresh subagent per task + review).
