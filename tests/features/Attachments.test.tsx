import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const del = vi.fn()
vi.mock('../../src/db/attachmentsRepo', () => ({
  listAttachments: vi.fn(async () => [
    { id: 'a1', transactionId: 'tx1', blob: new Blob(['x']), thumb: undefined, mime: 'image/jpeg', size: 1, createdAt: 't' },
  ]),
  addAttachment: vi.fn(async () => ({})),
  deleteAttachment: (...args: unknown[]) => del(...args),
}))

import { Attachments } from '../../src/features/transactions/Attachments'

beforeEach(() => {
  del.mockClear()
  ;(URL as any).createObjectURL = () => 'blob:mock'
  ;(URL as any).revokeObjectURL = () => {}
})

describe('Attachments', () => {
  it('renders an existing attachment and deletes it', async () => {
    render(<Attachments transactionId="tx1" />)
    await waitFor(() => expect(screen.getAllByRole('img').length).toBe(1))
    await userEvent.click(screen.getByLabelText('حذف الصورة'))
    expect(del).toHaveBeenCalledWith('a1')
  })
})
