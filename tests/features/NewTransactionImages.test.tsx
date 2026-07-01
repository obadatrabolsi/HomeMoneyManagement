import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'

vi.mock('../../src/lib/image', () => ({
  compressImage: vi.fn(async () => new Blob(['c'], { type: 'image/jpeg' })),
  makeThumb: vi.fn(async () => new Blob(['t'], { type: 'image/jpeg' })),
}))
const addAttachment = vi.fn(async () => ({}))
vi.mock('../../src/db/attachmentsRepo', () => ({ addAttachment: (...a: unknown[]) => addAttachment(...a) }))

import { TransactionForm } from '../../src/features/transactions/TransactionForm'

beforeEach(async () => {
  await db.delete(); await db.open()
  addAttachment.mockClear()
  ;(URL as any).createObjectURL = () => 'blob:mock'
  ;(URL as any).revokeObjectURL = () => {}
})

describe('new-transaction images', () => {
  it('attaches a picked image to the created transaction', async () => {
    const acc = await createAccount({ name: 'نقد', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    const onDone = vi.fn()
    const { container } = render(<TransactionForm onDone={onDone} />)
    await userEvent.type(screen.getByLabelText('المبلغ'), '10')
    // select the account (first <select>)
    const select = container.querySelector('select')!
    await userEvent.selectOptions(select, acc.id)
    // pick an image via the hidden file input
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(fileInput, new File(['x'], 'r.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(screen.getByAltText('مرفق')).toBeInTheDocument())
    await userEvent.click(screen.getByText('حفظ'))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(addAttachment).toHaveBeenCalledTimes(1)
    const arg = addAttachment.mock.calls[0][0] as { transactionId: string }
    const tx = (await db.transactions.toArray())[0]
    expect(arg.transactionId).toBe(tx.id)
  })
})
