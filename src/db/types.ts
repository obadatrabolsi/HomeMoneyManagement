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

export interface Budget {
  id: string
  categoryId: string
  month: string // yyyy-MM
  amount: number // cents
  currency: string
  createdAt: string
  updatedAt: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number // cents
  currency: string
  targetDate?: string // yyyy-MM-dd
  notes?: string
  icon: string
  color: string
  isArchived: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface GoalContribution {
  id: string
  goalId: string
  amount: number // cents, may be negative
  date: string // yyyy-MM-dd
  note?: string
  createdAt: string
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule {
  id: string
  type: 'income' | 'expense'
  amount: number // cents
  accountId: string
  categoryId?: string
  notes?: string
  merchant?: string
  tags: string[]
  frequency: RecurringFrequency
  interval: number // >= 1
  startDate: string // yyyy-MM-dd
  endDate?: string // yyyy-MM-dd
  nextRunDate: string // yyyy-MM-dd
  lastRunDate?: string // yyyy-MM-dd
  isActive: boolean
  createdAt: string
  updatedAt: string
}
