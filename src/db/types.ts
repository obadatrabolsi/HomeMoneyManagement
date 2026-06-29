export interface Account {
  id: string
  name: string
  description?: string
  icon: string
  color: string
  currency: string
  initialBalance: number // cents
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  parentId?: string
  sortOrder: number
  isArchived: boolean
}

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  amount: number // cents, always positive
  accountId: string
  categoryId?: string
  date: string // yyyy-MM-dd
  time?: string
  notes?: string
  tags: string[]
  merchant?: string
  isFavorite?: boolean
  transferGroupId?: string
  counterAccountId?: string
  transferDirection?: 'out' | 'in'
  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export interface Settings {
  id: 'singleton'
  defaultCurrency: string
  theme: 'light' | 'dark' | 'system'
  schemaVersion: number
}
