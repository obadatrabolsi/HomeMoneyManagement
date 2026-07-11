import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { createAccount } from '../../src/db/accountsRepo'
import { markSynced, SYNCED_TABLES } from '../../src/db/syncTracking'
import { SyncPage } from '../../src/features/sync/SyncPage'

beforeEach(async () => { await db.delete(); await db.open() })

async function markEverythingSynced() {
  for (const table of SYNCED_TABLES) {
    const ids = (await db.table(table).toArray()).map((r) => (r as { id: string }).id)
    await markSynced(table, ids)
  }
}

describe('SyncPage', () => {
  it('shows the count of unsynced items and drops to zero once synced', async () => {
    const a = await createAccount({ name: 'حسابي', icon: 'w', color: '#1', currency: 'EUR', initialBalance: 0 })
    render(<MemoryRouter><SyncPage /></MemoryRouter>)

    // The new account (and its default-account settings write is local-only) is pending.
    await waitFor(() => expect(screen.getByTestId('pending-count').textContent).toBe('1'))
    expect(screen.getByText('حسابي')).toBeInTheDocument()

    // Once synced, the live query re-renders to zero pending.
    await markEverythingSynced()
    await waitFor(() => expect(screen.getByTestId('pending-count').textContent).toBe('0'))
    expect(a.id).toBeTruthy()
  })
})
