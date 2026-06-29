import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { createCategory } from '../../src/db/categoriesRepo'
import { BudgetForm } from '../../src/features/budgets/BudgetForm'
import { PaymentForm } from '../../src/features/debts/PaymentForm'

beforeEach(async () => { await db.delete(); await db.open() })

describe('AmountValidation', () => {
  it('BudgetForm rejects zero amount', async () => {
    const onDone = vi.fn()
    // Seed settings so getSettings liveQuery never writes inside a read-only context
    await db.settings.put({ id: 'singleton', defaultCurrency: 'EUR', theme: 'system', schemaVersion: 5 })
    await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    render(<BudgetForm month="2026-06" onDone={onDone} />)

    // Wait for the category option to appear (useLiveQuery is async)
    const select = screen.getByRole('combobox')
    await waitFor(() => expect(screen.getByRole('option', { name: 'الطعام' })).toBeInTheDocument())
    await userEvent.selectOptions(select, screen.getByRole('option', { name: 'الطعام' }))

    // Type 0 in the amount field
    await userEvent.type(screen.getByLabelText('المبلغ'), '0')

    // Submit
    await userEvent.click(screen.getByText('حفظ'))

    // onDone should NOT have been called
    expect(onDone).not.toHaveBeenCalled()

    // Error message should appear
    expect(await screen.findByText('أدخل مبلغًا أكبر من صفر')).toBeInTheDocument()
  })

  it('PaymentForm rejects zero amount', async () => {
    const onDone = vi.fn()
    render(<PaymentForm debtId="d1" onDone={onDone} />)

    // Type 0 in the amount field
    await userEvent.type(screen.getByLabelText('المبلغ'), '0')

    // Submit
    await userEvent.click(screen.getByText('حفظ'))

    // onDone should NOT have been called
    expect(onDone).not.toHaveBeenCalled()

    // Error message should appear
    expect(await screen.findByText('أدخل مبلغًا أكبر من صفر')).toBeInTheDocument()
  })
})
