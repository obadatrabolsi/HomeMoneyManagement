import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { db } from '../../src/db/schema'

// Simulate a properly-configured build (real .env.local) with no active session.
vi.mock('../../src/db/supabase', () => ({
  isSupabaseConfigured: () => true,
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  }),
  currentUserId: async () => null,
}))
// Keep the background sync service inert during this UI test.
vi.mock('../../src/sync/service', () => ({
  onLogin: async () => {},
  startAutoSync: () => {},
  stopAutoSync: () => {},
  runSync: async () => {},
}))

import { AuthGate } from '../../src/features/auth/AuthGate'

beforeEach(async () => { await db.delete(); await db.open() })

describe('AuthGate (Supabase configured)', () => {
  it('locks the app behind the login screen when there is no session', async () => {
    render(<AuthGate><div>محتوى</div></AuthGate>)
    // App content is hidden; the login screen (email/password) is shown.
    await waitFor(() => expect(screen.getByLabelText('البريد الإلكتروني')).toBeInTheDocument())
    expect(screen.getByLabelText('كلمة المرور')).toBeInTheDocument()
    expect(screen.queryByText('محتوى')).not.toBeInTheDocument()
  })
})
