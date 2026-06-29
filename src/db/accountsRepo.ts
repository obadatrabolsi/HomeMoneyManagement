import { db } from './schema'
import { id } from '../lib/uuid'
import type { Account, Transaction } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

function signedAmount(tx: Transaction): number {
  if (tx.type === 'income') return tx.amount
  if (tx.type === 'expense') return -tx.amount
  // transfer
  return tx.transferDirection === 'in' ? tx.amount : -tx.amount
}

export async function createAccount(
  input: Omit<Account, 'id' | 'isArchived' | 'sortOrder' | 'createdAt' | 'updatedAt'> &
    Partial<Pick<Account, 'sortOrder'>>,
): Promise<Account> {
  const count = await db.accounts.count()
  const acc: Account = {
    id: id(),
    isArchived: false,
    sortOrder: input.sortOrder ?? count,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...input,
  }
  await db.accounts.add(acc)
  return acc
}

export async function updateAccount(accId: string, patch: Partial<Account>): Promise<void> {
  await db.accounts.update(accId, { ...patch, updatedAt: nowIso() })
}

export async function archiveAccount(accId: string): Promise<void> {
  await db.accounts.update(accId, { isArchived: true, updatedAt: nowIso() })
}

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const rows = await db.accounts.toArray()
  return rows
    .filter(a => includeArchived || !a.isArchived)
    .sort((x, y) => x.sortOrder - y.sortOrder)
}

export async function accountBalance(accountId: string): Promise<number> {
  const acc = await db.accounts.get(accountId)
  if (!acc) return 0
  const txs = await db.transactions.where('accountId').equals(accountId).toArray()
  const sum = txs
    .filter(t => !t.deletedAt)
    .reduce((acc2, t) => acc2 + signedAmount(t), 0)
  return acc.initialBalance + sum
}

export async function totalsByCurrency(): Promise<Record<string, number>> {
  const accounts = await listAccounts()
  const totals: Record<string, number> = {}
  for (const a of accounts) {
    totals[a.currency] = (totals[a.currency] ?? 0) + (await accountBalance(a.id))
  }
  return totals
}
