import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Toast } from '../../src/components/ui/Toast'

describe('Toast', () => {
  it('shows message and fires action', async () => {
    const onAction = vi.fn()
    render(<Toast message="تم الحذف" actionLabel="تراجع" onAction={onAction} onDismiss={() => {}} />)
    expect(screen.getByText('تم الحذف')).toBeInTheDocument()
    await userEvent.click(screen.getByText('تراجع'))
    expect(onAction).toHaveBeenCalled()
  })
})
