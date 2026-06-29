import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createBudget } from '../../src/db/budgetsRepo'
import { createCategory } from '../../src/db/categoriesRepo'
import { isoMonth } from '../../src/lib/date'
import { BudgetsPage } from '../../src/features/budgets/BudgetsPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('BudgetsPage', () => {
  it('lists budgets for the current month with the category name', async () => {
    const cat = await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    await createBudget({ categoryId: cat.id, month: isoMonth(new Date()), amount: 30000, currency: 'EUR' })
    render(<MemoryRouter><BudgetsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('الطعام')).toBeInTheDocument())
  })
})
