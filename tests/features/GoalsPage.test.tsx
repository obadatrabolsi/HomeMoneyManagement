import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createGoal } from '../../src/db/goalsRepo'
import { GoalsPage } from '../../src/features/goals/GoalsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('GoalsPage', () => {
  it('lists active goals by name', async () => {
    await createGoal({ name: 'صندوق الطوارئ', targetAmount: 100000, currency: 'EUR' })
    render(<MemoryRouter><GoalsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('صندوق الطوارئ')).toBeInTheDocument())
  })
})
