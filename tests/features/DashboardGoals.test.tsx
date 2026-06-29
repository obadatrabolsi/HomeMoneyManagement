import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createGoal } from '../../src/db/goalsRepo'
import { DashboardPage } from '../../src/features/dashboard/DashboardPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DashboardPage goals section', () => {
  it('shows the goals heading when a goal exists', async () => {
    await createGoal({ name: 'سفر', targetAmount: 100000, currency: 'EUR' })
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('الأهداف')).toBeInTheDocument())
  })
})
