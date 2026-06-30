const ITER = 150_000

function toB64(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

function fromB64(b64: string): Uint8Array {
  const s = atob(b64)
  const bytes = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i)
  return bytes
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptString(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  )
  return JSON.stringify({
    v: 1, kdf: 'PBKDF2', iter: ITER, hash: 'SHA-256',
    salt: toB64(salt), iv: toB64(iv), ct: toB64(ct),
  })
}

export async function decryptString(envelope: string, password: string): Promise<string> {
  let data: { salt?: string; iv?: string; ct?: string; iter?: number }
  try {
    data = JSON.parse(envelope)
  } catch {
    throw new Error('INVALID_ENVELOPE')
  }
  if (!data || !data.salt || !data.iv || !data.ct) throw new Error('INVALID_ENVELOPE')
  try {
    const key = await deriveKey(password, fromB64(data.salt))
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(data.iv) },
      key,
      fromB64(data.ct),
    )
    return new TextDecoder().decode(plain)
  } catch {
    throw new Error('DECRYPT_FAILED')
  }
}
