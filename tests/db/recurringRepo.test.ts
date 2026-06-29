import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createRule, listRules, updateRule, deleteRule, advanceDate, processDueRules } from '../../src/db/recurringRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('advanceDate', () => {
  it('advances by each frequency and interval', () => {
    expect(advanceDate('2026-06-01', 'daily', 1)).toBe('2026-06-02')
    expect(advanceDate('2026-06-01', 'weekly', 2)).toBe('2026-06-15')
    expect(advanceDate('2026-06-01', 'monthly', 1)).toBe('2026-07-01')
    expect(advanceDate('2026-06-01', 'yearly', 1)).toBe('2027-06-01')
  })
})

describe('recurringRepo CRUD', () => {
  it('creates with nextRunDate=startDate and active, lists, updates, deletes', async () => {
    const r = await createRule({ type: 'expense', amount: 2000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    expect(r.nextRunDate).toBe('2026-06-01')
    expect(r.isActive).toBe(true)
    expect((await listRules()).map(x => x.id)).toEqual([r.id])
    await updateRule(r.id, { amount: 3000 })
    expect((await listRules())[0].amount).toBe(3000)
    await deleteRule(r.id)
    expect(await listRules()).toHaveLength(0)
  })
})

describe('processDueRules', () => {
  it('does not generate before startDate', async () => {
    await createRule({ type: 'expense', amount: 2000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-07-01' })
    const created = await processDueRules('2026-06-15')
    expect(created).toBe(0)
    expect(await db.transactions.count()).toBe(0)
  })
  it('generates one transaction when exactly due and advances nextRunDate', async () => {
    const r = await createRule({ type: 'income', amount: 500000, accountId: 'a1', categoryId: 'salary', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    const created = await processDueRules('2026-06-01')
    expect(created).toBe(1)
    const txs = await db.transactions.toArray()
    expect(txs).toHaveLength(1)
    expect(txs[0].amount).toBe(500000)
    expect(txs[0].date).toBe('2026-06-01')
    expect(txs[0].type).toBe('income')
    expect((await db.recurringRules.get(r.id))?.nextRunDate).toBe('2026-07-01')
    expect((await db.recurringRules.get(r.id))?.lastRunDate).toBe('2026-06-01')
  })
  it('catches up multiple missed periods up to today', async () => {
    await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-01-01' })
    const created = await processDueRules('2026-04-15')
    expect(created).toBe(4) // Jan, Feb, Mar, Apr
    expect(await db.transactions.count()).toBe(4)
  })
  it('respects endDate and deactivates the rule after it passes', async () => {
    const r = await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'monthly', interval: 1, startDate: '2026-01-01', endDate: '2026-02-15' })
    const created = await processDueRules('2026-12-31')
    expect(created).toBe(2) // Jan 1, Feb 1 (Mar 1 > endDate)
    expect((await db.recurringRules.get(r.id))?.isActive).toBe(false)
  })
  it('skips inactive rules', async () => {
    const r = await createRule({ type: 'expense', amount: 1000, accountId: 'a1', frequency: 'daily', interval: 1, startDate: '2026-06-01' })
    await updateRule(r.id, { isActive: false })
    expect(await processDueRules('2026-06-10')).toBe(0)
  })
})
