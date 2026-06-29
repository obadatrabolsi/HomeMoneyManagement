import { db } from './schema'
import { id } from '../lib/uuid'
import type { Transaction, TransactionType } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateTransactionInput {
  type: Extract<TransactionType, 'income' | 'expense'>
  amount: number
  accountId: string
  categoryId?: string
  date: string
  time?: string
  notes?: string
  tags?: string[]
  merchant?: string
}

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  const tx: Transaction = {
    id: id(),
    tags: input.tags ?? [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input,
  }
  await db.transactions.add(tx)
  return tx
}

export async function updateTransaction(txId: string, patch: Partial<Transaction>): Promise<void> {
  await db.transactions.update(txId, { ...patch, updatedAt: nowIso() })
}

export async function getTransaction(txId: string): Promise<Transaction | undefined> {
  return db.transactions.get(txId)
}

export async function softDeleteTransaction(txId: string): Promise<string[]> {
  const tx = await db.transactions.get(txId)
  if (!tx) return []
  const stamp = nowIso()
  if (tx.transferGroupId) {
    const group = await db.transactions.where('transferGroupId').equals(tx.transferGroupId).toArray()
    const ids = group.map(g => g.id)
    await db.transactions.where('transferGroupId').equals(tx.transferGroupId).modify({ deletedAt: stamp })
    return ids
  }
  await db.transactions.update(txId, { deletedAt: stamp })
  return [txId]
}

export async function undoDelete(ids: string[]): Promise<void> {
  await db.transactions.where('id').anyOf(ids).modify({ deletedAt: undefined })
}

export async function toggleFavorite(txId: string): Promise<void> {
  const tx = await db.transactions.get(txId)
  if (!tx) return
  await db.transactions.update(txId, { isFavorite: !tx.isFavorite })
}

export interface CreateTransferInput {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  time?: string
  notes?: string
  tags?: string[]
}

export async function createTransfer(
  input: CreateTransferInput,
): Promise<{ groupId: string; outId: string; inId: string }> {
  if (input.fromAccountId === input.toAccountId) throw new Error('SAME_ACCOUNT')
  const groupId = id()
  const outId = id()
  const inId = id()
  const stamp = nowIso()

  await db.transaction('rw', db.accounts, db.transactions, async () => {
    const from = await db.accounts.get(input.fromAccountId)
    const to = await db.accounts.get(input.toAccountId)
    if (!from || !to) throw new Error('ACCOUNT_NOT_FOUND')
    if (from.currency !== to.currency) throw new Error('CURRENCY_MISMATCH')

    const base = {
      type: 'transfer' as const,
      amount: input.amount,
      date: input.date,
      time: input.time,
      notes: input.notes,
      tags: input.tags ?? [],
      transferGroupId: groupId,
      createdAt: stamp,
      updatedAt: stamp,
    }
    await db.transactions.bulkAdd([
      { ...base, id: outId, transferDirection: 'out', accountId: input.fromAccountId, counterAccountId: input.toAccountId },
      { ...base, id: inId, transferDirection: 'in', accountId: input.toAccountId, counterAccountId: input.fromAccountId },
    ])
  })

  return { groupId, outId, inId }
}

export interface TxFilter {
  accountId?: string
  type?: TransactionType
  categoryId?: string
  tags?: string[]
  from?: string
  to?: string
  text?: string
  sort?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
}

function matchesText(tx: Transaction, text: string): boolean {
  const q = text.trim().toLowerCase()
  if (q === '') return true
  const haystack = [tx.notes, tx.merchant, ...(tx.tags ?? [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (haystack.includes(q)) return true
  const asNumber = Number(q)
  if (!isNaN(asNumber) && Math.round(asNumber * 100) === tx.amount) return true
  return false
}

function sortTxs(rows: Transaction[], sort: TxFilter['sort']): Transaction[] {
  const s = sort ?? 'date_desc'
  return [...rows].sort((a, b) => {
    switch (s) {
      case 'date_asc': return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)
      case 'amount_desc': return b.amount - a.amount
      case 'amount_asc': return a.amount - b.amount
      case 'date_desc':
      default: return b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
    }
  })
}

export async function queryTransactions(filter: TxFilter): Promise<Transaction[]> {
  let rows = (await db.transactions.toArray()).filter(t => !t.deletedAt)
  if (filter.accountId) rows = rows.filter(t => t.accountId === filter.accountId)
  if (filter.type) rows = rows.filter(t => t.type === filter.type)
  if (filter.categoryId) rows = rows.filter(t => t.categoryId === filter.categoryId)
  if (filter.tags?.length) rows = rows.filter(t => filter.tags!.every(tag => t.tags.includes(tag)))
  if (filter.from) rows = rows.filter(t => t.date >= filter.from!)
  if (filter.to) rows = rows.filter(t => t.date <= filter.to!)
  if (filter.text) rows = rows.filter(t => matchesText(t, filter.text!))
  return sortTxs(rows, filter.sort)
}

export async function recentTransactions(limit: number): Promise<Transaction[]> {
  const rows = (await db.transactions.toArray()).filter(t => !t.deletedAt)
  return sortTxs(rows, 'date_desc').slice(0, limit)
}

export async function dayTotals(date: string): Promise<{ income: number; expense: number }> {
  return rangeTotals(date, date)
}

export async function rangeTotals(from: string, to: string): Promise<{ income: number; expense: number }> {
  const rows = (await db.transactions.toArray()).filter(
    t => !t.deletedAt && t.date >= from && t.date <= to,
  )
  return {
    income: rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expense: rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  }
}

export async function categoryBreakdown(
  from: string,
  to: string,
): Promise<Array<{ categoryId: string | null; total: number }>> {
  const rows = (await db.transactions.toArray()).filter(
    t => !t.deletedAt && t.type === 'expense' && t.date >= from && t.date <= to,
  )
  const map = new Map<string | null, number>()
  for (const t of rows) {
    const key = t.categoryId ?? null
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return [...map.entries()]
    .map(([categoryId, total]) => ({ categoryId, total }))
    .sort((a, b) => b.total - a.total)
}
