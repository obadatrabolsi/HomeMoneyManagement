import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from '../../src/routes/AppShell'

describe('AppShell', () => {
  it('renders bottom nav labels', () => {
    render(<MemoryRouter><AppShell /></MemoryRouter>)
    expect(screen.getByText('الرئيسية')).toBeInTheDocument()
    expect(screen.getByText('الحسابات')).toBeInTheDocument()
    expect(screen.getByText('العمليات')).toBeInTheDocument()
    expect(screen.getByText('الإعدادات')).toBeInTheDocument()
  })
})
