import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { AppShell } from '../../src/routes/AppShell'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('Budgets/Debts navigation swap', () => {
  it('bottom nav shows Debts and not Budgets', () => {
    render(<MemoryRouter><AppShell /></MemoryRouter>)
    expect(screen.getByText('الديون')).toBeInTheDocument()
    expect(screen.queryByText('الميزانيات')).not.toBeInTheDocument()
  })

  it('settings links to Budgets and not Debts', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByRole('link', { name: 'الميزانيات' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'الديون والقروض' })).not.toBeInTheDocument()
  })
})
