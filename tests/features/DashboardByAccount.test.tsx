import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { DashboardPage } from '../../src/features/dashboard/DashboardPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('Dashboard scoped by account', () => {
  it('defaults to the default account and rescopes on selection', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createTransaction({ type: 'income', amount: 1000, accountId: a.id, date: '2026-07-10', notes: 'راتب-ألف' })
    await createTransaction({ type: 'income', amount: 5000, accountId: b.id, date: '2026-07-10', notes: 'راتب-باء' })

    render(<MemoryRouter><DashboardPage /></MemoryRouter>)

    // Default account is A (first created) → only A's transaction is listed.
    await waitFor(() => expect(screen.getByText('راتب-ألف')).toBeInTheDocument())
    expect(screen.queryByText('راتب-باء')).not.toBeInTheDocument()

    const select = screen.getByLabelText('الحساب') as HTMLSelectElement
    await userEvent.selectOptions(select, b.id)
    await waitFor(() => expect(screen.getByText('راتب-باء')).toBeInTheDocument())
    expect(screen.queryByText('راتب-ألف')).not.toBeInTheDocument()

    // "All accounts" shows both.
    await userEvent.selectOptions(select, '')
    await waitFor(() => expect(screen.getByText('راتب-ألف')).toBeInTheDocument())
    expect(screen.getByText('راتب-باء')).toBeInTheDocument()
  })
})
