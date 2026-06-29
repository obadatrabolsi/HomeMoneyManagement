import Dexie, { type Table } from 'dexie'
import type { Account, Category, Transaction, Settings, Budget } from './types'

export const SCHEMA_VERSION = 2

export class MoneyDB extends Dexie {
  accounts!: Table<Account, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  settings!: Table<Settings, string>
  budgets!: Table<Budget, string>

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
  }
}

export const db = new MoneyDB()
