import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Sheet } from '../../src/components/ui/Sheet'

describe('Sheet', () => {
  it('renders children when open and nothing when closed', () => {
    const { rerender } = render(<Sheet open onClose={() => {}}><div>محتوى</div></Sheet>)
    expect(screen.getByText('محتوى')).toBeInTheDocument()
    rerender(<Sheet open={false} onClose={() => {}}><div>محتوى</div></Sheet>)
    expect(screen.queryByText('محتوى')).not.toBeInTheDocument()
  })

  it('pushes a history entry when opened so the back button has something to consume', () => {
    const spy = vi.spyOn(window.history, 'pushState')
    render(<Sheet open onClose={() => {}}><div>محتوى</div></Sheet>)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  it('closes on browser back (popstate) instead of leaving the app', async () => {
    const onClose = vi.fn()
    render(<Sheet open onClose={onClose}><div>محتوى</div></Sheet>)
    window.dispatchEvent(new PopStateEvent('popstate'))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
