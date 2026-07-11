import { db } from './schema'
import { id } from '../lib/uuid'
import type { Budget } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateBudgetInput {
  categoryId: string
  month: string
  amount: number
  currency: string
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const existing = await db.budgets
    .where('[month+currency]').equals([input.month, input.currency])
    .filter(b => b.categoryId === input.categoryId && !b.deletedAt)
    .first()
  if (existing) throw new Error('DUPLICATE_BUDGET')
  const budget: Budget = { id: id(), createdAt: nowIso(), updatedAt: nowIso(), ...input }
  await db.budgets.add(budget)
  return budget
}

export async function updateBudget(budgetId: string, patch: Partial<Budget>): Promise<void> {
  await db.budgets.update(budgetId, { ...patch, updatedAt: nowIso() })
}

export async function deleteBudget(budgetId: string): Promise<void> {
  await db.budgets.update(budgetId, { deletedAt: nowIso() })
}

export async function listBudgets(month: string): Promise<Budget[]> {
  const rows = await db.budgets.where('month').equals(month).toArray()
  return rows.filter(b => !b.deletedAt)
}

export interface BudgetProgress {
  budget: Budget
  spent: number
  remaining: number
  percent: number
  status: 'ok' | 'near' | 'over'
}

export async function budgetProgress(month: string): Promise<BudgetProgress[]> {
  const [budgets, accounts, txs] = await Promise.all([
    listBudgets(month),
    db.accounts.toArray(),
    db.transactions.toArray(),
  ])
  const currencyOf: Record<string, string> = {}
  for (const a of accounts) currencyOf[a.id] = a.currency

  return budgets.map(budget => {
    const spent = txs
      .filter(t =>
        !t.deletedAt &&
        t.type === 'expense' &&
        t.categoryId === budget.categoryId &&
        t.date.slice(0, 7) === month &&
        currencyOf[t.accountId] === budget.currency,
      )
      .reduce((s, t) => s + t.amount, 0)
    const percent = budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0
    const status: BudgetProgress['status'] = percent >= 100 ? 'over' : percent >= 80 ? 'near' : 'ok'
    return { budget, spent, remaining: budget.amount - spent, percent, status }
  })
}
