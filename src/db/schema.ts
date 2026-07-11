import Dexie, { type Table } from 'dexie'
import type { Account, Category, Transaction, Settings, Budget, Goal, GoalContribution, RecurringRule, Debt, DebtPayment, Attachment, SyncMeta } from './types'
import { installSyncHooks } from './syncTracking'

export const SCHEMA_VERSION = 7

export class MoneyDB extends Dexie {
  accounts!: Table<Account, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  settings!: Table<Settings, string>
  budgets!: Table<Budget, string>
  goals!: Table<Goal, string>
  goalContributions!: Table<GoalContribution, string>
  recurringRules!: Table<RecurringRule, string>
  debts!: Table<Debt, string>
  debtPayments!: Table<DebtPayment, string>
  attachments!: Table<Attachment, string>
  syncMeta!: Table<SyncMeta, string>

  constructor() {
    super('money-manager')
    this.version(1).stores({
      accounts: 'id, isArchived, sortOrder',
      categories: 'id, type, parentId, isArchived',
      transactions:
        'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
      settings: 'id',
    })
    this.version(2).stores({
      accounts: 'id, isArchived, sortOrder',
      categories: 'id, type, parentId, isArchived',
      transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
      settings: 'id',
      budgets: 'id, categoryId, month, [month+currency]',
    })
    this.version(3).stores({
      accounts: 'id, isArchived, sortOrder',
      categories: 'id, type, parentId, isArchived',
      transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
      settings: 'id',
      budgets: 'id, categoryId, month, [month+currency]',
      goals: 'id, isArchived, sortOrder',
      goalContributions: 'id, goalId',
    })
    this.version(4).stores({
      accounts: 'id, isArchived, sortOrder',
      categories: 'id, type, parentId, isArchived',
      transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
      settings: 'id',
      budgets: 'id, categoryId, month, [month+currency]',
      goals: 'id, isArchived, sortOrder',
      goalContributions: 'id, goalId',
      recurringRules: 'id, isActive, nextRunDate',
    })
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
    // v7: cloud-sync foundation — add syncState/deletedAt/userId indexes to every
    // synced table, a syncMeta cursor table, and backfill existing rows so the
    // client's current data is preserved and queued for its first upload.
    this.version(7).stores({
      accounts: 'id, isArchived, sortOrder, syncState, deletedAt, userId',
      categories: 'id, type, parentId, isArchived, syncState, deletedAt, userId',
      transactions: 'id, accountId, categoryId, date, type, transferGroupId, deletedAt, syncState, userId, [accountId+date]',
      settings: 'id',
      budgets: 'id, categoryId, month, syncState, deletedAt, userId, [month+currency]',
      goals: 'id, isArchived, sortOrder, syncState, deletedAt, userId',
      goalContributions: 'id, goalId, syncState, deletedAt, userId',
      recurringRules: 'id, isActive, nextRunDate, syncState, deletedAt, userId',
      debts: 'id, direction, isSettled, syncState, deletedAt, userId',
      debtPayments: 'id, debtId, syncState, deletedAt, userId',
      attachments: 'id, transactionId',
      syncMeta: 'table',
    }).upgrade(async (tx) => {
      const tables = [
        'accounts', 'categories', 'transactions', 'budgets', 'goals',
        'goalContributions', 'recurringRules', 'debts', 'debtPayments',
      ]
      for (const name of tables) {
        await tx.table(name).toCollection().modify((row: Record<string, unknown>) => {
          if (row.syncState === undefined) row.syncState = 'pending'
          if (row.updatedAt === undefined) row.updatedAt = row.createdAt ?? new Date().toISOString()
        })
      }
    })
  }
}

export const db = new MoneyDB()

// Keep updatedAt + syncState in step on every write to a synced table.
installSyncHooks(db)
