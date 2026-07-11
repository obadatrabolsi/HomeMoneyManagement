import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../src/db/schema'
import { AuthGate } from '../../src/features/auth/AuthGate'

beforeEach(async () => { await db.delete(); await db.open() })

describe('AuthGate', () => {
  it('stays open when Supabase is not configured (pure-offline build)', async () => {
    // No VITE_SUPABASE_* env in the test environment → no backend to gate on.
    render(<AuthGate><div>محتوى</div></AuthGate>)
    await waitFor(() => expect(screen.getByText('محتوى')).toBeInTheDocument())
  })
})
