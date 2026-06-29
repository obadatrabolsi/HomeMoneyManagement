import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { TransactionForm } from '../../src/features/transactions/TransactionForm'

beforeEach(async () => { await db.delete(); await db.open() })

describe('TransactionForm', () => {
  it('creates an expense', async () => {
    const a = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const onDone = vi.fn()
    render(<TransactionForm onDone={onDone} />)
    await userEvent.type(screen.getByLabelText('المبلغ'), '12.50')
    await userEvent.click(screen.getByText('حفظ'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const txs = await db.transactions.toArray()
    expect(txs[0].amount).toBe(1250)
  })
})
