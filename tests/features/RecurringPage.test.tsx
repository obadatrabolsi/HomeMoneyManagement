import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createRule } from '../../src/db/recurringRepo'
import { RecurringPage } from '../../src/features/recurring/RecurringPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('RecurringPage', () => {
  it('lists active rules by merchant', async () => {
    await createRule({ type: 'expense', amount: 1599, accountId: 'a1', merchant: 'Netflix', frequency: 'monthly', interval: 1, startDate: '2026-06-01' })
    render(<MemoryRouter><RecurringPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Netflix')).toBeInTheDocument())
  })
})
