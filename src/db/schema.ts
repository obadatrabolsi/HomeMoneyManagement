import Dexie, { type Table } from 'dexie'
import type { Account, Category, Transaction, Settings, Budget, Goal, GoalContribution, RecurringRule, Debt, DebtPayment, Attachment } from './types'

export const SCHEMA_VERSION = 6

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
  }
}

export const db = new MoneyDB()
