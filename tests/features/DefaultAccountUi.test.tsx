import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount, getDefaultAccountId, setDefaultAccount, listAccounts } from '../../src/db/accountsRepo'
import { AccountsPage } from '../../src/features/accounts/AccountsPage'
import { AccountDetailPage } from '../../src/features/accounts/AccountDetailPage'
import { AccountForm } from '../../src/features/accounts/AccountForm'
import { TransactionForm } from '../../src/features/transactions/TransactionForm'

beforeEach(async () => { await db.delete(); await db.open() })

describe('default account UI', () => {
  it('shows the "افتراضي" badge next to the default account in the list', async () => {
    const a = await createAccount({ name: 'الأول', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await createAccount({ name: 'الثاني', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await setDefaultAccount(a.id)
    render(<MemoryRouter><AccountsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('الأول')).toBeInTheDocument())
    expect(screen.getByText('افتراضي')).toBeInTheDocument()
  })

  it('sets the account as default from the detail page', async () => {
    const a = await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    expect(await getDefaultAccountId()).toBe(a.id)
    render(
      <MemoryRouter initialEntries={[`/accounts/${b.id}`]}>
        <Routes><Route path="/accounts/:id" element={<AccountDetailPage />} /></Routes>
      </MemoryRouter>,
    )
    const btn = await screen.findByRole('button', { name: 'تعيين كحساب افتراضي' })
    await userEvent.click(btn)
    await waitFor(async () => expect(await getDefaultAccountId()).toBe(b.id))
  })

  it('creating an account with the default checkbox makes it the default', async () => {
    await createAccount({ name: 'الأول', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const onDone = vi.fn()
    render(<AccountForm onDone={onDone} />)
    await userEvent.type(screen.getByLabelText('الاسم'), 'جديد')
    await userEvent.click(screen.getByLabelText('الحساب الافتراضي'))
    await userEvent.click(screen.getByText('حفظ'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const created = (await listAccounts()).find((x) => x.name === 'جديد')!
    expect(await getDefaultAccountId()).toBe(created.id)
  })

  it('pre-selects the default account in the transaction form', async () => {
    await createAccount({ name: 'A', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const b = await createAccount({ name: 'B', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    await setDefaultAccount(b.id)
    render(<TransactionForm onDone={vi.fn()} />)
    await waitFor(() => {
      const select = screen.getByLabelText('الحساب') as HTMLSelectElement
      expect(select.value).toBe(b.id)
    })
  })
})
