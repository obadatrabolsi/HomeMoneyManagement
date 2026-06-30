import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../src/db/schema'
import { setPin } from '../../src/db/lockRepo'
import { LockGate } from '../../src/features/lock/LockGate'

beforeAll(async () => {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    const { webcrypto } = await import('node:crypto')
    // @ts-expect-error assign Node webcrypto for the test env
    globalThis.crypto = webcrypto
  }
})
beforeEach(async () => { await db.delete(); await db.open() })

describe('LockGate', () => {
  it('renders children when no PIN is set', async () => {
    render(<LockGate><div>محتوى</div></LockGate>)
    await waitFor(() => expect(screen.getByText('محتوى')).toBeInTheDocument())
  })
  it('locks when a PIN is set and unlocks on correct PIN', async () => {
    await setPin('1234')
    render(<LockGate><div>محتوى</div></LockGate>)
    // locked: content hidden, PIN entry shown
    await waitFor(() => expect(screen.getByLabelText('أدخل الرمز')).toBeInTheDocument())
    expect(screen.queryByText('محتوى')).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('أدخل الرمز'), '1234')
    await userEvent.click(screen.getByText('فتح'))
    await waitFor(() => expect(screen.getByText('محتوى')).toBeInTheDocument())
  })
})
