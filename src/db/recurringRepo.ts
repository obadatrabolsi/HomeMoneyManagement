import { format, addDays, addWeeks, addMonths, addYears, parseISO } from 'date-fns'
import { db } from './schema'
import { id } from '../lib/uuid'
import { createTransaction } from './transactionsRepo'
import type { RecurringRule, RecurringFrequency } from './types'

function nowIso(): string {
  return new Date().toISOString()
}

export interface CreateRuleInput {
  type: 'income' | 'expense'
  amount: number
  accountId: string
  categoryId?: string
  notes?: string
  merchant?: string
  tags?: string[]
  frequency: RecurringFrequency
  interval: number
  startDate: string
  endDate?: string
}

export async function createRule(input: CreateRuleInput): Promise<RecurringRule> {
  const rule: RecurringRule = {
    id: id(),
    type: input.type,
    amount: input.amount,
    accountId: input.accountId,
    categoryId: input.categoryId,
    notes: input.notes,
    merchant: input.merchant,
    tags: input.tags ?? [],
    frequency: input.frequency,
    interval: Math.max(1, Math.floor(input.interval) || 1),
    startDate: input.startDate,
    endDate: input.endDate,
    nextRunDate: input.startDate,
    isActive: true,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  await db.recurringRules.add(rule)
  return rule
}

export async function updateRule(ruleId: string, patch: Partial<RecurringRule>): Promise<void> {
  await db.recurringRules.update(ruleId, { ...patch, updatedAt: nowIso() })
}

export async function deleteRule(ruleId: string): Promise<void> {
  await db.recurringRules.update(ruleId, { deletedAt: nowIso() })
}

export async function listRules(includeInactive = false): Promise<RecurringRule[]> {
  const rows = (await db.recurringRules.toArray()).filter(r => !r.deletedAt)
  return rows
    .filter(r => includeInactive || r.isActive)
    .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
}

export function advanceDate(date: string, frequency: RecurringFrequency, interval: number): string {
  const n = Math.max(1, Math.floor(interval) || 1)
  const d = parseISO(date)
  const advanced =
    frequency === 'daily' ? addDays(d, n)
    : frequency === 'weekly' ? addWeeks(d, n)
    : frequency === 'monthly' ? addMonths(d, n)
    : addYears(d, n)
  return format(advanced, 'yyyy-MM-dd')
}

export async function processDueRules(today: string): Promise<number> {
  const rules = await db.recurringRules.toArray()
  let created = 0
  for (const rule of rules) {
    if (rule.deletedAt || !rule.isActive) continue
    let count = rule.runCount ?? 0
    let next = rule.nextRunDate
    let last = rule.lastRunDate
    let guard = 0
    while (next <= today && (!rule.endDate || next <= rule.endDate)) {
      if (++guard > 5000) { console.warn(`recurring rule ${rule.id} hit catch-up cap`); break }
      await createTransaction({
        type: rule.type, amount: rule.amount, accountId: rule.accountId,
        categoryId: rule.categoryId, date: next, notes: rule.notes,
        merchant: rule.merchant, tags: rule.tags,
      })
      last = next
      count++
      next = advanceDate(rule.startDate, rule.frequency, rule.interval * count)
      created++
    }
    const deactivate = !!rule.endDate && next > rule.endDate
    await updateRule(rule.id, { nextRunDate: next, lastRunDate: last, runCount: count, isActive: deactivate ? false : rule.isActive })
  }
  return created
}
