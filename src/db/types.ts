export type SyncState = 'pending' | 'synced'

/**
 * Fields shared by every cloud-synced entity (added in schema v7).
 * - `updatedAt` is the Last-Write-Wins clock for sync.
 * - `deletedAt` is a tombstone so deletes propagate between devices.
 * - `userId` scopes the row to its owner once cloud sync is enabled.
 * - `syncState` drives the "pending vs synced" sync-status UI.
 */
export interface Syncable {
  updatedAt: string
  deletedAt?: string
  userId?: string
  syncState?: SyncState
}

export interface Account extends Syncable {
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
}

export type CategoryType = 'income' | 'expense'

export interface Category extends Syncable {
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

export interface Transaction extends Syncable {
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
}

export interface Settings {
  id: 'singleton'
  defaultCurrency: string
  defaultAccountId?: string
  theme: 'light' | 'dark' | 'system'
  schemaVersion: number
  pinSalt?: string
  pinHash?: string
}

export interface Budget extends Syncable {
  id: string
  categoryId: string
  month: string // yyyy-MM
  amount: number // cents
  currency: string
  createdAt: string
}

export interface Goal extends Syncable {
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
}

export interface GoalContribution extends Syncable {
  id: string
  goalId: string
  amount: number // cents, may be negative
  date: string // yyyy-MM-dd
  note?: string
  createdAt: string
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface RecurringRule extends Syncable {
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
  runCount?: number // occurrences generated so far (anchors nextRunDate to startDate)
  isActive: boolean
  createdAt: string
}

export type DebtDirection = 'owe' | 'owed'

export interface Debt extends Syncable {
  id: string
  direction: DebtDirection
  person: string
  amount: number // cents, total principal
  currency: string
  dueDate?: string // yyyy-MM-dd
  notes?: string
  isSettled: boolean
  createdAt: string
}

export interface DebtPayment extends Syncable {
  id: string
  debtId: string
  amount: number // cents
  date: string // yyyy-MM-dd
  note?: string
  createdAt: string
}

export interface Attachment {
  id: string
  transactionId: string
  blob: Blob
  thumb?: Blob
  mime: string
  size: number
  createdAt: string
}

/**
 * Per-table sync bookkeeping (local only). `lastPulledAt` is the newest
 * server `updatedAt` we have already pulled for that table (the pull cursor).
 */
export interface SyncMeta {
  table: string
  lastPulledAt: string
}
