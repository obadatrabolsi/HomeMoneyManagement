import { describe, it, expect, beforeEach, beforeAll } from 'vitest'
import { db } from '../../src/db/schema'
import { setPin, verifyPin, isPinSet, clearPin } from '../../src/db/lockRepo'

beforeAll(async () => {
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    const { webcrypto } = await import('node:crypto')
    // @ts-expect-error assign Node webcrypto for the test env
    globalThis.crypto = webcrypto
  }
})
beforeEach(async () => { await db.delete(); await db.open() })

describe('lockRepo', () => {
  it('reports no PIN initially', async () => {
    expect(await isPinSet()).toBe(false)
  })
  it('sets and verifies a PIN', async () => {
    await setPin('1234')
    expect(await isPinSet()).toBe(true)
    expect(await verifyPin('1234')).toBe(true)
    expect(await verifyPin('0000')).toBe(false)
  })
  it('clears a PIN', async () => {
    await setPin('1234')
    await clearPin()
    expect(await isPinSet()).toBe(false)
    expect(await verifyPin('1234')).toBe(false)
  })
})
