import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { DashboardPage } from '../../src/features/dashboard/DashboardPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DashboardPage', () => {
  it('shows total balance heading', async () => {
    await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 5000 })
    render(<MemoryRouter><DashboardPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('إجمالي الرصيد')).toBeInTheDocument())
  })
})
