import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { TransactionRow } from '../../src/features/transactions/TransactionRow'

beforeEach(async () => { await db.delete(); await db.open() })

describe('TransactionRow', () => {
  it('renders amount and fires delete', async () => {
    const onDeleted = vi.fn()
    const tx = { id: 't1', type: 'expense' as const, amount: 1250, accountId: 'a1', date: '2026-06-01', tags: [], createdAt: 't', updatedAt: 't' }
    await db.transactions.add(tx)
    render(<TransactionRow tx={tx} onDeleted={onDeleted} />)
    await userEvent.click(screen.getByLabelText('حذف'))
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(['t1']))
  })
})
