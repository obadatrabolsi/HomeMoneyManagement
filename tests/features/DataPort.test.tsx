import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('DataPort UI', () => {
  it('shows CSV export and import controls on the settings page', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByText('تصدير CSV')).toBeInTheDocument()
    expect(screen.getByText('استيراد CSV')).toBeInTheDocument()
  })
})
