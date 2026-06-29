import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../../src/components/ui/Button'

describe('Button', () => {
  it('renders children and fires onClick', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>احفظ</Button>)
    await userEvent.click(screen.getByText('احفظ'))
    expect(onClick).toHaveBeenCalled()
  })
})
