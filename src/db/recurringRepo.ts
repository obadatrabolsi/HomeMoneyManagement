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
    interval: input.interval,
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
  await db.recurringRules.delete(ruleId)
}

export async function listRules(includeInactive = false): Promise<RecurringRule[]> {
  const rows = await db.recurringRules.toArray()
  return rows
    .filter(r => includeInactive || r.isActive)
    .sort((a, b) => a.nextRunDate.localeCompare(b.nextRunDate))
}

export function advanceDate(date: string, frequency: RecurringFrequency, interval: number): string {
  const d = parseISO(date)
  const advanced =
    frequency === 'daily' ? addDays(d, interval)
    : frequency === 'weekly' ? addWeeks(d, interval)
    : frequency === 'monthly' ? addMonths(d, interval)
    : addYears(d, interval)
  return format(advanced, 'yyyy-MM-dd')
}

export async function processDueRules(today: string): Promise<number> {
  const rules = await db.recurringRules.toArray()
  let created = 0
  for (const rule of rules) {
    if (!rule.isActive) continue
    let next = rule.nextRunDate
    let last = rule.lastRunDate
    while (next <= today && (!rule.endDate || next <= rule.endDate)) {
      await createTransaction({
        type: rule.type,
        amount: rule.amount,
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        date: next,
        notes: rule.notes,
        merchant: rule.merchant,
        tags: rule.tags,
      })
      last = next
      next = advanceDate(next, rule.frequency, rule.interval)
      created++
    }
    const deactivate = !!rule.endDate && next > rule.endDate
    await updateRule(rule.id, {
      nextRunDate: next,
      lastRunDate: last,
      isActive: deactivate ? false : rule.isActive,
    })
  }
  return created
}
