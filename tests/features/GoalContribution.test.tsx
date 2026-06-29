import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createGoal, addContribution, goalsWithProgress } from '../../src/db/goalsRepo'
import { GoalsPage } from '../../src/features/goals/GoalsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('GoalContribution', () => {
  it('renders goal name after creation', async () => {
    await createGoal({ name: 'هدف السفر', targetAmount: 5000, currency: 'USD' })
    render(<MemoryRouter><GoalsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('هدف السفر')).toBeInTheDocument())
  })

  it('goalsWithProgress reflects contribution current and percent', async () => {
    const goal = await createGoal({ name: 'شراء سيارة', targetAmount: 10000, currency: 'USD' })

    // Before any contribution
    const before = await goalsWithProgress()
    expect(before).toHaveLength(1)
    expect(before[0].current).toBe(0)
    expect(before[0].percent).toBe(0)

    // Add a contribution of 2500 (25% of 10000)
    await addContribution({ goalId: goal.id, amount: 2500, date: '2026-06-30' })

    const after = await goalsWithProgress()
    expect(after).toHaveLength(1)
    expect(after[0].current).toBe(2500)
    expect(after[0].percent).toBe(25)
    expect(after[0].reached).toBe(false)
  })

  it('goalsWithProgress marks goal as reached when contributions meet target', async () => {
    const goal = await createGoal({ name: 'صندوق طارئ', targetAmount: 1000, currency: 'SAR' })
    await addContribution({ goalId: goal.id, amount: 600, date: '2026-06-28' })
    await addContribution({ goalId: goal.id, amount: 400, date: '2026-06-30' })

    const results = await goalsWithProgress()
    expect(results[0].current).toBe(1000)
    expect(results[0].percent).toBe(100)
    expect(results[0].reached).toBe(true)
  })
})
