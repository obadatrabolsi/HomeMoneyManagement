import { describe, it, expect, beforeAll } from 'vitest'
import { encryptString, decryptString } from '../../src/lib/crypto'

beforeAll(async () => {
  // jsdom may not provide SubtleCrypto — use Node's webcrypto
  if (!globalThis.crypto || !globalThis.crypto.subtle) {
    const { webcrypto } = await import('node:crypto')
    // @ts-expect-error assign Node webcrypto into the global for the test env
    globalThis.crypto = webcrypto
  }
})

describe('crypto', () => {
  it('round-trips plaintext with the correct password', async () => {
    const env = await encryptString('{"hello":"عالم"}', 'pa$$w0rd')
    expect(env).toContain('"v"')
    expect(env).not.toContain('عالم') // ciphertext, not plaintext
    expect(await decryptString(env, 'pa$$w0rd')).toBe('{"hello":"عالم"}')
  })
  it('fails with the wrong password', async () => {
    const env = await encryptString('secret', 'right')
    await expect(decryptString(env, 'wrong')).rejects.toThrow('DECRYPT_FAILED')
  })
  it('rejects a malformed envelope', async () => {
    await expect(decryptString('{not json', 'x')).rejects.toThrow('INVALID_ENVELOPE')
    await expect(decryptString('{"v":1}', 'x')).rejects.toThrow('INVALID_ENVELOPE')
  })
  it('produces different ciphertext each time (random salt/iv)', async () => {
    const a = await encryptString('same', 'pw')
    const b = await encryptString('same', 'pw')
    expect(a).not.toBe(b)
  })
})
