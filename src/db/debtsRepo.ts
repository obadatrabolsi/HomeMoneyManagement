import { db } from './schema'
import { id } from '../lib/uuid'
import type { Debt, DebtPayment, DebtDirection } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateDebtInput {
  direction: DebtDirection
  person: string
  amount: number
  currency: string
  dueDate?: string
  notes?: string
}

export async function createDebt(input: CreateDebtInput): Promise<Debt> {
  const debt: Debt = { id: id(), isSettled: false, createdAt: nowIso(), updatedAt: nowIso(), ...input }
  await db.debts.add(debt)
  return debt
}

export async function updateDebt(debtId: string, patch: Partial<Debt>): Promise<void> {
  await db.debts.update(debtId, { ...patch, updatedAt: nowIso() })
}

export async function deleteDebt(debtId: string): Promise<void> {
  await db.transaction('rw', db.debts, db.debtPayments, async () => {
    await db.debtPayments.where('debtId').equals(debtId).delete()
    await db.debts.delete(debtId)
  })
}

export interface ListDebtsFilter {
  direction?: DebtDirection
  includeSettled?: boolean
}

export async function listDebts(filter: ListDebtsFilter = {}): Promise<Debt[]> {
  let rows = await db.debts.toArray()
  if (filter.direction) rows = rows.filter(d => d.direction === filter.direction)
  if (filter.includeSettled === false) rows = rows.filter(d => !d.isSettled)
  return rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export interface AddPaymentInput {
  debtId: string
  amount: number
  date: string
  note?: string
}

export async function addPayment(input: AddPaymentInput): Promise<DebtPayment> {
  const payment: DebtPayment = { id: id(), createdAt: nowIso(), ...input }
  await db.debtPayments.add(payment)
  return payment
}

export async function listPayments(debtId: string): Promise<DebtPayment[]> {
  const rows = await db.debtPayments.where('debtId').equals(debtId).toArray()
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export interface DebtProgress {
  debt: Debt
  paid: number
  remaining: number
  percent: number
  settled: boolean
}

async function paidByDebt(): Promise<Record<string, number>> {
  const payments = await db.debtPayments.toArray()
  const sums: Record<string, number> = {}
  for (const p of payments) sums[p.debtId] = (sums[p.debtId] ?? 0) + p.amount
  return sums
}

export async function debtsWithProgress(filter: ListDebtsFilter = {}): Promise<DebtProgress[]> {
  const [debts, sums] = await Promise.all([listDebts(filter), paidByDebt()])
  return debts.map(debt => {
    const paid = sums[debt.id] ?? 0
    const percent = debt.amount > 0 ? Math.round((paid / debt.amount) * 100) : 0
    const settled = debt.isSettled || (debt.amount > 0 && paid >= debt.amount)
    return { debt, paid, remaining: Math.max(debt.amount - paid, 0), percent, settled }
  })
}

export async function remainingTotalsByDirection(): Promise<{ owe: Record<string, number>; owed: Record<string, number> }> {
  const progress = await debtsWithProgress()
  const totals = { owe: {} as Record<string, number>, owed: {} as Record<string, number> }
  for (const p of progress) {
    if (p.settled) continue
    const bucket = totals[p.debt.direction]
    bucket[p.debt.currency] = (bucket[p.debt.currency] ?? 0) + p.remaining
  }
  return totals
}
