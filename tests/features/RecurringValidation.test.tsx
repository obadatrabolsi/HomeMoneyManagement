import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { RecurringForm } from '../../src/features/recurring/RecurringForm'

beforeEach(async () => { await db.delete(); await db.open() })

describe('RecurringForm date validation', () => {
  it('shows error and does not call onDone when endDate < startDate', async () => {
    await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const onDone = vi.fn()
    render(<RecurringForm onDone={onDone} />)

    // Wait for account to appear in the account select and select it
    const accountSelect = screen.getByLabelText('الحساب')
    await waitFor(() => expect(screen.getByRole('option', { name: 'نقد' })).toBeInTheDocument())
    await userEvent.selectOptions(accountSelect, 'نقد')

    // Enter a valid amount
    await userEvent.type(screen.getByLabelText('المبلغ'), '50')

    // Set startDate to a later date than endDate using fireEvent.change (reliable for date inputs)
    const startInput = screen.getByLabelText('تاريخ البداية')
    const endInput = screen.getByLabelText('تاريخ النهاية')
    fireEvent.change(startInput, { target: { value: '2026-06-20' } })
    fireEvent.change(endInput, { target: { value: '2026-06-10' } })

    await userEvent.click(screen.getByText('حفظ'))

    expect(onDone).not.toHaveBeenCalled()
    expect(await screen.findByText('تاريخ النهاية يجب أن يكون بعد تاريخ البداية')).toBeInTheDocument()
  })
})
