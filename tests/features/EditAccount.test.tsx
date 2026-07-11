import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { AccountDetailPage } from '../../src/features/accounts/AccountDetailPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('edit account name', () => {
  it('renames the account from the detail page', async () => {
    const a = await createAccount({ name: 'قديم', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    render(
      <MemoryRouter initialEntries={[`/accounts/${a.id}`]}>
        <Routes><Route path="/accounts/:id" element={<AccountDetailPage />} /></Routes>
      </MemoryRouter>,
    )
    await screen.findByRole('heading', { name: 'قديم' })

    await userEvent.click(screen.getByRole('button', { name: 'تعديل' }))
    const input = await screen.findByLabelText('الاسم')
    await userEvent.clear(input)
    await userEvent.type(input, 'جديد')
    await userEvent.click(screen.getByRole('button', { name: 'حفظ' }))

    await waitFor(async () => expect((await db.accounts.get(a.id))?.name).toBe('جديد'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'جديد' })).toBeInTheDocument())
  })
})
