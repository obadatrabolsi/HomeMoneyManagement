import { db, SCHEMA_VERSION } from './schema'
import type { Account, Category, Transaction, Settings } from './types'

interface BackupShape {
  schemaVersion: number
  exportedAt: string
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  settings: Settings | null
}

export async function exportBackup(): Promise<string> {
  const [accounts, categories, transactions, settings] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.settings.get('singleton'),
  ])
  const payload: BackupShape = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    settings: settings ?? null,
  }
  return JSON.stringify(payload, null, 2)
}

export async function importBackup(json: string): Promise<void> {
  let data: BackupShape
  try {
    data = JSON.parse(json)
  } catch {
    throw new Error('INVALID_BACKUP')
  }
  if (!data || typeof data !== 'object' || !Array.isArray(data.accounts)) {
    throw new Error('INVALID_BACKUP')
  }
  if (data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('INCOMPATIBLE_VERSION')
  }
  await db.transaction('rw', db.accounts, db.categories, db.transactions, db.settings, async () => {
    await Promise.all([
      db.accounts.clear(),
      db.categories.clear(),
      db.transactions.clear(),
      db.settings.clear(),
    ])
    await db.accounts.bulkAdd(data.accounts)
    await db.categories.bulkAdd(data.categories ?? [])
    await db.transactions.bulkAdd(data.transactions ?? [])
    if (data.settings) await db.settings.put(data.settings)
  })
}
