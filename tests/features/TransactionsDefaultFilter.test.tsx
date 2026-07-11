import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount, setDefaultAccount } from '../../src/db/accountsRepo'
import { useUiStore } from '../../src/stores/uiStore'
import { TransactionsPage } from '../../src/features/transactions/TransactionsPage'

beforeEach(async () => {
  await db.delete(); await db.open()
  useUiStore.getState().resetFilter()
})

describe('Transactions default account filter', () => {
  it('preselects the default account in the filter on first open', async () => {
    await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'USD', initialBalance: 0 })
    await setDefaultAccount(b.id)

    render(<MemoryRouter><TransactionsPage /></MemoryRouter>)

    await waitFor(() => {
      const select = screen.getByLabelText('الحساب') as HTMLSelectElement
      expect(select.value).toBe(b.id)
    })
  })

  it('does not re-apply the default after the user switches to all accounts', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })

    const first = render(<MemoryRouter><TransactionsPage /></MemoryRouter>)
    const select = await screen.findByLabelText('الحساب') as HTMLSelectElement
    await waitFor(() => expect(select.value).toBe(a.id))
    await userEvent.selectOptions(select, '')
    expect(select.value).toBe('')
    first.unmount()

    render(<MemoryRouter><TransactionsPage /></MemoryRouter>)
    const select2 = await screen.findByLabelText('الحساب') as HTMLSelectElement
    // The one-time default must not override the user's "all accounts" choice.
    await waitFor(() => expect(select2.value).toBe(''))
  })
})
