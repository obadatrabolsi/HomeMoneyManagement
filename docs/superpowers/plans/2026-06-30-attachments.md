# Transaction Attachments (Images) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let users attach optional images (e.g. receipts) to a transaction, stored performantly so browsing/reports stay fast.

**Architecture:** Images live in a SEPARATE Dexie object store `attachments` as `Blob`s, indexed by `transactionId`, loaded ONLY when viewing a single transaction (never during list/report queries). The transaction row shows a 📎 indicator derived from the attachment index keys (no blob loading). Images are compressed client-side before storage. Attachments are excluded from the JSON backup (they'd bloat it).

**Tech Stack:** Existing — React, TS, Dexie + dexie-react-hooks, Tailwind (RTL), Vitest + fake-indexeddb. Compression via `<canvas>` (browser only).

## Global Constraints

- NEVER store image data inside the `transactions` table (would load with every list/report query). Store in the separate `attachments` store only.
- `attachments` blobs are loaded lazily — only `listAttachments(transactionId)` (called from a single-transaction view) reads blobs. The list 📎 indicator uses `transactionIdsWithAttachments()` which reads only index keys (no blobs).
- Compress before storing: max dimension ~1600px, JPEG quality ~0.7; also keep a ~200px thumbnail. Display via `URL.createObjectURL` + revoke; never base64 in the DOM.
- Attachments are EXCLUDED from `exportBackup`/`importBackup` JSON (documented). Importing a backup must not delete existing attachments.
- Schema bump to v6 (additive `attachments` table; preserves v1–v5 data).
- UI matches current redesign conventions (`Sheet`, `Field`, `Button`, `input` class, design tokens). Re-read shared files before editing; additive edits; stage only your files (no `git add -A`); pre-commit hook auto-bumps `package.json` — let it run. A concurrent session may edit shared files.
- TDD for the repo (tests use plain `Blob`s under fake-indexeddb). The canvas-based image util is browser-only — keep it thin and don't unit-test the canvas path.
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task AT1: Schema v6 + Attachment type + attachmentsRepo

**Files:**
- Modify: `src/db/types.ts` (add `Attachment`), `src/db/schema.ts` (version 6 + `attachments` table)
- Create: `src/db/attachmentsRepo.ts`
- Test: `tests/db/attachmentsRepo.test.ts`

**Interfaces:**
- Produces: `Attachment` type; `db.attachments`; `SCHEMA_VERSION = 6`.
  - `addAttachment(input: { transactionId: string; blob: Blob; thumb?: Blob; mime?: string }): Promise<Attachment>`
  - `listAttachments(transactionId: string): Promise<Attachment[]>` (loads blobs — view only)
  - `getAttachment(id: string): Promise<Attachment | undefined>`
  - `deleteAttachment(id: string): Promise<void>`
  - `deleteAttachmentsFor(transactionId: string): Promise<void>`
  - `transactionIdsWithAttachments(): Promise<Set<string>>` — via index keys only (no blob load).

- [ ] **Step 1: Write the failing test**

`tests/db/attachmentsRepo.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db, SCHEMA_VERSION } from '../../src/db/schema'
import { addAttachment, listAttachments, getAttachment, deleteAttachment, deleteAttachmentsFor, transactionIdsWithAttachments } from '../../src/db/attachmentsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

function img(text = 'data'): Blob {
  return new Blob([text], { type: 'image/jpeg' })
}

describe('schema v6', () => {
  it('is version 6 and exposes attachments', () => {
    expect(SCHEMA_VERSION).toBe(6)
    expect(db.attachments).toBeTruthy()
  })
})

describe('attachmentsRepo', () => {
  it('adds and lists attachments for a transaction with mime/size derived', async () => {
    const a = await addAttachment({ transactionId: 't1', blob: img('hello') })
    expect(a.mime).toBe('image/jpeg')
    expect(a.size).toBe(5)
    const list = await listAttachments('t1')
    expect(list).toHaveLength(1)
    expect(list[0].blob).toBeInstanceOf(Blob)
  })
  it('gets and deletes a single attachment', async () => {
    const a = await addAttachment({ transactionId: 't1', blob: img() })
    expect(await getAttachment(a.id)).toBeTruthy()
    await deleteAttachment(a.id)
    expect(await getAttachment(a.id)).toBeUndefined()
  })
  it('deletes all attachments for a transaction', async () => {
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't2', blob: img() })
    await deleteAttachmentsFor('t1')
    expect(await listAttachments('t1')).toHaveLength(0)
    expect(await listAttachments('t2')).toHaveLength(1)
  })
  it('returns the set of transaction ids that have attachments', async () => {
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't1', blob: img() })
    await addAttachment({ transactionId: 't3', blob: img() })
    const ids = await transactionIdsWithAttachments()
    expect(ids.has('t1')).toBe(true)
    expect(ids.has('t3')).toBe(true)
    expect(ids.has('t2')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- attachmentsRepo`
Expected: FAIL.

- [ ] **Step 3: Add the type**

In `src/db/types.ts` add:
```ts
export interface Attachment {
  id: string
  transactionId: string
  blob: Blob
  thumb?: Blob
  mime: string
  size: number
  createdAt: string
}
```

- [ ] **Step 4: Bump the schema**

In `src/db/schema.ts`: import `Attachment`; change `SCHEMA_VERSION` to `6`; add field `attachments!: Table<Attachment, string>`; keep existing version blocks and ADD:
```ts
this.version(6).stores({
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
  attachments: 'id, transactionId',
})
```
(Re-read the current `schema.ts` first — copy the existing store strings verbatim; only ADD the `attachments` line.)

- [ ] **Step 5: Write attachmentsRepo**

`src/db/attachmentsRepo.ts`:
```ts
import { db } from './schema'
import { id } from '../lib/uuid'
import type { Attachment } from './types'

export interface AddAttachmentInput {
  transactionId: string
  blob: Blob
  thumb?: Blob
  mime?: string
}

export async function addAttachment(input: AddAttachmentInput): Promise<Attachment> {
  const att: Attachment = {
    id: id(),
    transactionId: input.transactionId,
    blob: input.blob,
    thumb: input.thumb,
    mime: input.mime ?? input.blob.type ?? 'application/octet-stream',
    size: input.blob.size,
    createdAt: new Date().toISOString(),
  }
  await db.attachments.add(att)
  return att
}

export async function listAttachments(transactionId: string): Promise<Attachment[]> {
  return db.attachments.where('transactionId').equals(transactionId).toArray()
}

export async function getAttachment(attId: string): Promise<Attachment | undefined> {
  return db.attachments.get(attId)
}

export async function deleteAttachment(attId: string): Promise<void> {
  await db.attachments.delete(attId)
}

export async function deleteAttachmentsFor(transactionId: string): Promise<void> {
  await db.attachments.where('transactionId').equals(transactionId).delete()
}

export async function transactionIdsWithAttachments(): Promise<Set<string>> {
  const keys = await db.attachments.orderBy('transactionId').uniqueKeys()
  return new Set(keys as string[])
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- attachmentsRepo`
Expected: PASS.

- [ ] **Step 7: Confirm backup ignores attachments**

Run: `npm test -- backupRepo`
Expected: PASS (the backup reads an explicit table list that does NOT include `attachments`, so blobs never enter the JSON backup, and import does not clear attachments). No code change needed — just confirm green. If any backup test fails because of the schema bump, re-read and fix only the version/whitelist if needed.

- [ ] **Step 8: Full suite + commit**

Run: `npm test` (all pass).
```bash
git add src/db/types.ts src/db/schema.ts src/db/attachmentsRepo.ts tests/db/attachmentsRepo.test.ts
git commit -m "feat: add attachments store and repository (separate from transactions)"
```

---

### Task AT2: Image compression util + Attachments UI + integration + list indicator

**Files:**
- Create: `src/lib/image.ts`, `src/features/transactions/Attachments.tsx`
- Modify: `src/features/transactions/EditTransactionSheet.tsx` (mount `Attachments`), `src/features/transactions/TransactionsPage.tsx` + `TransactionRow.tsx` (📎 indicator), `src/i18n/ar.ts`
- Test: `tests/features/Attachments.test.tsx`

**Interfaces:**
- Consumes: `addAttachment`/`listAttachments`/`deleteAttachment`/`transactionIdsWithAttachments` (AT1).
- Produces: `compressImage(file, maxDim?, quality?)`/`makeThumb(file, size?)` (browser canvas); an `Attachments` component (thumbnails grid + add via file input → compress → store + view full + delete); a 📎 indicator on rows that have attachments.

> Re-READ `EditTransactionSheet.tsx`, `TransactionsPage.tsx`, `TransactionRow.tsx`, `i18n/ar.ts`, and the `src/components/ui/` primitives FIRST. Additive edits; leave concurrent-session changes untouched.

- [ ] **Step 1: Image util**

`src/lib/image.ts`:
```ts
async function drawScaled(file: Blob, maxDim: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close?.()
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality),
  )
}

export function compressImage(file: Blob, maxDim = 1600, quality = 0.7): Promise<Blob> {
  return drawScaled(file, maxDim, quality)
}

export function makeThumb(file: Blob, size = 200): Promise<Blob> {
  return drawScaled(file, size, 0.6)
}
```

- [ ] **Step 2: Write the failing test**

`tests/features/Attachments.test.tsx` (tests render + delete via the repo, avoiding the canvas path):
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { addAttachment, listAttachments } from '../../src/db/attachmentsRepo'
import { Attachments } from '../../src/features/transactions/Attachments'

beforeEach(async () => {
  await db.delete(); await db.open()
  if (!URL.createObjectURL) (URL as any).createObjectURL = () => 'blob:mock'
  if (!URL.revokeObjectURL) (URL as any).revokeObjectURL = () => {}
})

describe('Attachments', () => {
  it('renders existing attachments and deletes one', async () => {
    await addAttachment({ transactionId: 'tx1', blob: new Blob(['x'], { type: 'image/jpeg' }) })
    render(<Attachments transactionId="tx1" />)
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(1))
    await userEvent.click(screen.getByLabelText('حذف الصورة'))
    await waitFor(async () => expect(await listAttachments('tx1')).toHaveLength(0))
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- Attachments`
Expected: FAIL (module not found).

- [ ] **Step 4: Add i18n keys**

In `src/i18n/ar.ts` add (only missing): `attachments: 'المرفقات'`, `addImage: 'إضافة صورة'`, `deleteImage: 'حذف الصورة'`.

- [ ] **Step 5: Write the Attachments component**

`src/features/transactions/Attachments.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { addAttachment, deleteAttachment, listAttachments } from '../../db/attachmentsRepo'
import { compressImage, makeThumb } from '../../lib/image'
import { t } from '../../i18n/ar'
import type { Attachment } from '../../db/types'

export function Attachments({ transactionId }: { transactionId: string }) {
  const items = useLiveQuery(() => listAttachments(transactionId), [transactionId], [])
  const [busy, setBusy] = useState(false)

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    try {
      for (const f of files) {
        const blob = await compressImage(f)
        const thumb = await makeThumb(f)
        await addAttachment({ transactionId, blob, thumb, mime: 'image/jpeg' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((a) => <Thumb key={a.id} att={a} />)}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-ink">
        {busy ? '…' : t('addImage')}
        <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={onFiles} disabled={busy} />
      </label>
    </div>
  )
}

function Thumb({ att }: { att: Attachment }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(att.thumb ?? att.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [att.id])

  const openFull = () => {
    const u = URL.createObjectURL(att.blob)
    window.open(u, '_blank')
    setTimeout(() => URL.revokeObjectURL(u), 60000)
  }

  return (
    <div className="relative">
      <img src={url} alt="مرفق" className="h-20 w-20 rounded-lg object-cover" onClick={openFull} />
      <button
        type="button"
        aria-label={t('deleteImage')}
        onClick={() => deleteAttachment(att.id)}
        className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-expense text-xs text-white"
      >×</button>
    </div>
  )
}
```
> Note: `db` import may be unused — remove it if so to keep the build clean.

- [ ] **Step 6: Mount in EditTransactionSheet**

Re-read `src/features/transactions/EditTransactionSheet.tsx`. In `EditForm`, import `Attachments` and render `<Field label={t('attachments')}><Attachments transactionId={tx.id} /></Field>` just above the error/submit area (additive).

- [ ] **Step 7: Add the 📎 indicator to the list**

Re-read `src/features/transactions/TransactionsPage.tsx` and `TransactionRow.tsx`.
- In `TransactionsPage`'s `useLiveQuery`, also compute `const attachSet = await transactionIdsWithAttachments()` (import it) and pass `hasAttachment={attachSet.has(tx.id)}` to each `TransactionRow`.
- In `TransactionRow`, accept an optional `hasAttachment?: boolean` prop and render a small 📎 next to the description when true. Keep all existing props/behavior.

- [ ] **Step 8: Run tests + build**

Run: `npm test -- Attachments` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/lib/image.ts src/features/transactions/Attachments.tsx src/features/transactions/EditTransactionSheet.tsx src/features/transactions/TransactionsPage.tsx src/features/transactions/TransactionRow.tsx src/i18n/ar.ts tests/features/Attachments.test.tsx
git commit -m "feat: attach/view/delete transaction images with compression and list indicator"
```

---

## Self-Review

**Spec coverage:** separate `attachments` Blob store + schema v6 + lazy repo + index-key presence set + backup exclusion (AT1) ✓; client-side compression + thumbnails + attach/view/delete UI in the edit sheet + 📎 list indicator + i18n (AT2) ✓. Images never enter the `transactions` table or list/report queries ✓.

**Placeholder scan:** none — AT1 full code; AT2 component + integration steps concrete (with re-read instructions for contended files).

**Type consistency:** `Attachment` (AT1) used by repo + component; `addAttachment`/`listAttachments`/`deleteAttachment`/`transactionIdsWithAttachments` defined in AT1, consumed in AT2; `compressImage`/`makeThumb` (AT2 util) used by the component.

---

## Execution Handoff

Execute via superpowers:subagent-driven-development.
