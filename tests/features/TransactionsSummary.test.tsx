import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { createTransaction } from '../../src/db/transactionsRepo'
import { useUiStore } from '../../src/stores/uiStore'
import { TransactionsPage } from '../../src/features/transactions/TransactionsPage'

beforeEach(async () => {
  await db.delete(); await db.open()
  useUiStore.getState().resetFilter()
})

function count() {
  return within(screen.getByText('العدد').parentElement as HTMLElement).getByText(/^\d+$/).textContent
}

describe('Transactions summary total', () => {
  it('shows a running total that recomputes when the filter changes', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })
    await createTransaction({ type: 'income', amount: 1000, accountId: a.id, date: '2026-07-01' })
    await createTransaction({ type: 'expense', amount: 400, accountId: a.id, date: '2026-07-02' })
    await createTransaction({ type: 'income', amount: 5000, accountId: b.id, date: '2026-07-03' })

    render(<MemoryRouter><TransactionsPage /></MemoryRouter>)

    // No filter → all three rows are counted.
    await waitFor(() => expect(count()).toBe('3'))

    // Filter to account A → only its two transactions remain.
    const select = screen.getByLabelText('الحساب') as HTMLSelectElement
    await userEvent.selectOptions(select, a.id)
    await waitFor(() => expect(count()).toBe('2'))
  })
})
