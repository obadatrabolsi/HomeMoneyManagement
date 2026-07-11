import { db } from './schema'
import { id } from '../lib/uuid'
import { updateSettings } from './settingsRepo'
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
  // First account created becomes the default automatically.
  if ((await getDefaultAccountId()) === undefined) {
    await setDefaultAccount(acc.id)
  }
  return acc
}

// Older builds stored the account icon as a text token (e.g. "wallet"); the UI
// now renders the icon glyph directly, so migrate any legacy token to an emoji.
const LEGACY_ICON_MAP: Record<string, string> = {
  wallet: '🏦', cash: '💵', card: '💳', bank: '🏦', coins: '🪙', piggy: '🐷',
}

export async function migrateLegacyAccountIcons(): Promise<void> {
  const accounts = await db.accounts.toArray()
  for (const a of accounts) {
    const mapped = LEGACY_ICON_MAP[a.icon]
    if (mapped) await db.accounts.update(a.id, { icon: mapped })
  }
}

export async function updateAccount(accId: string, patch: Partial<Account>): Promise<void> {
  await db.accounts.update(accId, { ...patch, updatedAt: nowIso() })
}

export async function archiveAccount(accId: string): Promise<void> {
  await db.accounts.update(accId, { isArchived: true, updatedAt: nowIso() })
  // If we just archived the default account, hand the default to the first
  // remaining non-archived account (or clear it when none are left).
  if ((await getDefaultAccountId()) === accId) {
    const remaining = await listAccounts()
    await updateSettings({ defaultAccountId: remaining[0]?.id })
  }
}

export async function getDefaultAccountId(): Promise<string | undefined> {
  const settings = await db.settings.get('singleton')
  return settings?.defaultAccountId
}

export async function setDefaultAccount(accountId: string): Promise<void> {
  await updateSettings({ defaultAccountId: accountId })
}

/**
 * The stored default account id if it still points to a live (non-archived)
 * account; otherwise the first account; `undefined` when there are none.
 */
export async function resolveDefaultAccountId(): Promise<string | undefined> {
  const accounts = await listAccounts()
  if (accounts.length === 0) return undefined
  const stored = await getDefaultAccountId()
  if (stored && accounts.some(a => a.id === stored)) return stored
  return accounts[0].id
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
