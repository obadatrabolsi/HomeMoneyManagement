import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { ReportsPage } from '../../src/features/reports/ReportsPage'

beforeEach(async () => {
  await db.delete(); await db.open()
  await createAccount({ name: 'E', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
})

describe('ReportsPage', () => {
  it('renders the reports heading and net summary label', async () => {
    render(<MemoryRouter><ReportsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('التقارير')).toBeInTheDocument())
    expect(screen.getByText('الصافي')).toBeInTheDocument()
  })
})
