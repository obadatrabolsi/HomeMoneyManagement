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
