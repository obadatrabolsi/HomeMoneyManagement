import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../src/db/schema'
import { createCategory } from '../../src/db/categoriesRepo'
import { CategoriesPage } from '../../src/features/categories/CategoriesPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('CategoriesPage', () => {
  it('lists existing categories', async () => {
    await createCategory({ name: 'الطعام', type: 'expense', icon: 'food', color: '#f00' })
    render(<CategoriesPage />)
    await waitFor(() => expect(screen.getAllByText('الطعام').length).toBeGreaterThan(0))
  })
})
