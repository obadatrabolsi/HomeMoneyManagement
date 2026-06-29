import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createDebt } from '../../src/db/debtsRepo'
import { DebtsPage } from '../../src/features/debts/DebtsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DebtsPage', () => {
  it('lists a debt by person name', async () => {
    await createDebt({ direction: 'owe', person: 'أحمد', amount: 50000, currency: 'EUR' })
    render(<MemoryRouter><DebtsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('أحمد')).toBeInTheDocument())
  })
})
