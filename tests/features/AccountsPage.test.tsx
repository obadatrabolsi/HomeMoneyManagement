import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { AccountsPage } from '../../src/features/accounts/AccountsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('AccountsPage', () => {
  it('lists accounts with balances', async () => {
    await createAccount({ name: 'نقد', icon: 'w', color: '#10b981', currency: 'EUR', initialBalance: 5000 })
    render(<MemoryRouter><AccountsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('نقد')).toBeInTheDocument())
  })
})
