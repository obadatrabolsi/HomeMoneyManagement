import Dexie, { type Table } from 'dexie'
import type { Account, Category, Transaction, Settings } from './types'

export const SCHEMA_VERSION = 1

export class MoneyDB extends Dexie {
  accounts!: Table<Account, string>
  categories!: Table<Category, string>
  transactions!: Table<Transaction, string>
  settings!: Table<Settings, string>

  constructor() {
    super('money-manager')
    this.version(SCHEMA_VERSION).stores({
      accounts: 'id, isArchived, sortOrder',
      categories: 'id, type, parentId, isArchived',
      transactions:
        'id, accountId, categoryId, date, type, transferGroupId, deletedAt, [accountId+date]',
      settings: 'id',
    })
  }
}

export const db = new MoneyDB()
