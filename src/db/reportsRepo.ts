import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from './schema'
import type { Transaction } from './types'

async function scopedTxs(from: string, to: string, accountId: string): Promise<Transaction[]> {
  const txs = await db.transactions.toArray()
  return txs.filter(t => !t.deletedAt && t.date >= from && t.date <= to && t.accountId === accountId)
}

export async function incomeExpenseTotals(from: string, to: string, accountId: string): Promise<{ income: number; expense: number; net: number }> {
  const rows = await scopedTxs(from, to, accountId)
  const income = rows.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = rows.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  return { income, expense, net: income - expense }
}

export async function categorySpending(from: string, to: string, accountId: string): Promise<Array<{ categoryId: string | null; total: number }>> {
  const rows = (await scopedTxs(from, to, accountId)).filter(t => t.type === 'expense')
  const map = new Map<string | null, number>()
  for (const t of rows) {
    const key = t.categoryId ?? null
    map.set(key, (map.get(key) ?? 0) + t.amount)
  }
  return [...map.entries()].map(([categoryId, total]) => ({ categoryId, total })).sort((a, b) => b.total - a.total)
}

export async function monthlyTotals(year: number, accountId: string): Promise<Array<{ month: string; income: number; expense: number }>> {
  const from = `${year}-01-01`
  const to = `${year}-12-31`
  const rows = await scopedTxs(from, to, accountId)
  const months = Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, '0')}`
    return { month, income: 0, expense: 0 }
  })
  for (const t of rows) {
    const idx = Number(t.date.slice(5, 7)) - 1
    if (idx < 0 || idx > 11) continue
    if (t.type === 'income') months[idx].income += t.amount
    else if (t.type === 'expense') months[idx].expense += t.amount
  }
  return months
}

export interface Statistics {
  transactionCount: number
  largestExpense: Transaction | null
  largestIncome: Transaction | null
  avgDailyExpense: number
  topCategoryId: string | null
  topCategoryTotal: number
  mostUsedAccountId: string | null
}

export async function statistics(from: string, to: string, accountId: string): Promise<Statistics> {
  const rows = await scopedTxs(from, to, accountId)
  const incExp = rows.filter(t => t.type === 'income' || t.type === 'expense')
  const expenses = rows.filter(t => t.type === 'expense')
  const incomes = rows.filter(t => t.type === 'income')

  const largest = (list: Transaction[]) =>
    list.length === 0 ? null : list.reduce((m, t) => (t.amount > m.amount ? t : m))

  const days = Math.max(1, differenceInCalendarDays(parseISO(to), parseISO(from)) + 1)
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)

  const catMap = new Map<string | null, number>()
  for (const t of expenses) catMap.set(t.categoryId ?? null, (catMap.get(t.categoryId ?? null) ?? 0) + t.amount)
  let topCategoryId: string | null = null
  let topCategoryTotal = 0
  for (const [k, v] of catMap) if (v > topCategoryTotal) { topCategoryTotal = v; topCategoryId = k }

  const acctMap = new Map<string, number>()
  for (const t of incExp) acctMap.set(t.accountId, (acctMap.get(t.accountId) ?? 0) + 1)
  let mostUsedAccountId: string | null = null
  let mostUsedCount = 0
  for (const [k, v] of acctMap) if (v > mostUsedCount) { mostUsedCount = v; mostUsedAccountId = k }

  return {
    transactionCount: incExp.length,
    largestExpense: largest(expenses),
    largestIncome: largest(incomes),
    avgDailyExpense: Math.round(totalExpense / days),
    topCategoryId,
    topCategoryTotal,
    mostUsedAccountId,
  }
}
