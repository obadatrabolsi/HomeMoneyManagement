import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BackupPage } from '../../src/features/backup/BackupPage'

describe('BackupPage', () => {
  it('renders export and import controls', () => {
    render(<BackupPage />)
    expect(screen.getByText('تصدير نسخة احتياطية')).toBeInTheDocument()
    expect(screen.getByText('استيراد نسخة احتياطية')).toBeInTheDocument()
  })
})
