import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { createGoal, listGoals, updateGoal, archiveGoal, addContribution, listContributions, goalsWithProgress } from '../../src/db/goalsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('goalsRepo', () => {
  it('creates, lists, updates, archives', async () => {
    const g = await createGoal({ name: 'سفر', targetAmount: 100000, currency: 'EUR' })
    expect((await listGoals()).map(x => x.id)).toEqual([g.id])
    await updateGoal(g.id, { name: 'رحلة' })
    expect((await listGoals())[0].name).toBe('رحلة')
    await archiveGoal(g.id)
    expect(await listGoals()).toHaveLength(0)
    expect(await listGoals(true)).toHaveLength(1)
  })
  it('tracks contributions (positive and negative) and progress', async () => {
    const g = await createGoal({ name: 'طوارئ', targetAmount: 10000, currency: 'EUR' })
    await addContribution({ goalId: g.id, amount: 8000, date: '2026-06-01' })
    await addContribution({ goalId: g.id, amount: 1000, date: '2026-06-05' })
    await addContribution({ goalId: g.id, amount: -1000, date: '2026-06-06' }) // withdrawal
    expect((await listContributions(g.id)).length).toBe(3)
    const [p] = await goalsWithProgress()
    expect(p.current).toBe(8000)
    expect(p.remaining).toBe(2000)
    expect(p.percent).toBe(80)
    expect(p.reached).toBe(false)
  })
  it('marks reached when current meets or exceeds target', async () => {
    const g = await createGoal({ name: 'لابتوب', targetAmount: 5000, currency: 'EUR' })
    await addContribution({ goalId: g.id, amount: 5000, date: '2026-06-01' })
    const [p] = await goalsWithProgress()
    expect(p.reached).toBe(true)
    expect(p.percent).toBe(100)
    expect(p.remaining).toBe(0)
  })
  it('handles target of zero without dividing by zero', async () => {
    await createGoal({ name: 'بلا هدف', targetAmount: 0, currency: 'EUR' })
    const [p] = await goalsWithProgress()
    expect(p.percent).toBe(0)
    expect(p.reached).toBe(false)
  })
})
