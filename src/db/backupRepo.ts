import { db, SCHEMA_VERSION } from './schema'
import type { Account, Category, Transaction, Settings, Budget, Goal, GoalContribution, RecurringRule, Debt, DebtPayment } from './types'

interface BackupShape {
  schemaVersion: number
  exportedAt: string
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  settings: Settings | null
  budgets?: Budget[]
  goals?: Goal[]
  goalContributions?: GoalContribution[]
  recurringRules?: RecurringRule[]
  debts?: Debt[]
  debtPayments?: DebtPayment[]
}

export async function exportBackup(): Promise<string> {
  const [accounts, categories, transactions, settings, budgets, goals, goalContributions, recurringRules, debts, debtPayments] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.settings.get('singleton'),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.goalContributions.toArray(),
    db.recurringRules.toArray(),
    db.debts.toArray(),
    db.debtPayments.toArray(),
  ])
  const payload: BackupShape = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    accounts, categories, transactions,
    settings: settings ? { ...settings, pinSalt: undefined, pinHash: undefined } : null,
    budgets, goals, goalContributions, recurringRules, debts, debtPayments,
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
  if (![1, 2, 3, 4, 5, 6, 7].includes(data.schemaVersion)) {
    throw new Error('INCOMPATIBLE_VERSION')
  }
  const arrayFields = ['categories', 'transactions', 'budgets', 'goals', 'goalContributions', 'recurringRules', 'debts', 'debtPayments'] as const
  for (const f of arrayFields) {
    if ((data as any)[f] !== undefined && !Array.isArray((data as any)[f])) {
      throw new Error('INVALID_BACKUP')
    }
  }
  const current = await db.settings.get('singleton')
  const devicePinSalt = current?.pinSalt
  const devicePinHash = current?.pinHash
  await db.transaction('rw', [db.accounts, db.categories, db.transactions, db.settings, db.budgets, db.goals, db.goalContributions, db.recurringRules, db.debts, db.debtPayments, db.attachments], async () => {
    await Promise.all([
      db.accounts.clear(), db.categories.clear(), db.transactions.clear(), db.settings.clear(), db.budgets.clear(),
      db.goals.clear(), db.goalContributions.clear(), db.recurringRules.clear(),
      db.debts.clear(), db.debtPayments.clear(), db.attachments.clear(),
    ])
    await db.accounts.bulkAdd(data.accounts)
    await db.categories.bulkAdd(data.categories ?? [])
    await db.transactions.bulkAdd(data.transactions ?? [])
    await db.budgets.bulkAdd(data.budgets ?? [])
    await db.goals.bulkAdd(data.goals ?? [])
    await db.goalContributions.bulkAdd(data.goalContributions ?? [])
    await db.recurringRules.bulkAdd(data.recurringRules ?? [])
    await db.debts.bulkAdd(data.debts ?? [])
    await db.debtPayments.bulkAdd(data.debtPayments ?? [])
    if (data.settings) await db.settings.put({ ...data.settings, pinSalt: devicePinSalt ?? '', pinHash: devicePinHash ?? '' })
  })
}
