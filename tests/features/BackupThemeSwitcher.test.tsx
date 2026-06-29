import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { getSettings } from '../../src/db/settingsRepo'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => {
  await db.delete(); await db.open()
  // jsdom lacks matchMedia
  if (!window.matchMedia) (window as any).matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
})

describe('theme switcher', () => {
  it('renders the appearance control and persists a theme change', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByText('المظهر')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'داكن' }))
    await waitFor(async () => expect((await getSettings()).theme).toBe('dark'))
  })
})
