import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { ReportsPage } from '../../src/features/reports/ReportsPage'
import { isoDate } from '../../src/lib/date'

beforeEach(async () => { await db.delete(); await db.open() })

function countValue() {
  // The "عدد العمليات" stat: find its label, read the sibling value.
  const label = screen.getByText('عدد العمليات')
  return within(label.parentElement as HTMLElement).getAllByText(/^\d+$/)[0].textContent
}

describe('Reports scoped by account', () => {
  it('defaults to the default account and rescopes on selection', async () => {
    const today = isoDate(new Date())
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createTransaction({ type: 'expense', amount: 100, accountId: a.id, date: today, categoryId: 'x' })
    await createTransaction({ type: 'expense', amount: 200, accountId: a.id, date: today, categoryId: 'x' })
    await createTransaction({ type: 'expense', amount: 300, accountId: a.id, date: today, categoryId: 'x' })
    await createTransaction({ type: 'expense', amount: 400, accountId: b.id, date: today, categoryId: 'x' })

    render(<MemoryRouter><ReportsPage /></MemoryRouter>)

    // Default = A (first created), which has 3 transactions this month.
    await waitFor(() => expect(screen.getByText('عدد العمليات')).toBeInTheDocument())
    const select = screen.getByLabelText('الحساب') as HTMLSelectElement
    expect(select.value).toBe(a.id)
    await waitFor(() => expect(countValue()).toBe('3'))

    await userEvent.selectOptions(select, b.id)
    await waitFor(() => expect(countValue()).toBe('1'))
  })
})
