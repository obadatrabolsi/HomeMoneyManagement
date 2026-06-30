import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('Encrypted backup UI', () => {
  it('shows encrypted export and import controls', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByText('تصدير مشفّر')).toBeInTheDocument()
    expect(screen.getByText('استيراد مشفّر')).toBeInTheDocument()
  })
})
