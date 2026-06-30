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

async function deriveKey(password: string, salt: Uint8Array, iter: number, hash: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iter, hash },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function hashSecret(secret: string, saltB64?: string): Promise<{ salt: string; hash: string }> {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16))
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, baseKey, 256)
  return { salt: toB64(salt), hash: toB64(new Uint8Array(bits)) }
}

export async function verifySecret(secret: string, saltB64: string, hashB64: string): Promise<boolean> {
  const { hash } = await hashSecret(secret, saltB64)
  return hash === hashB64
}

export async function encryptString(plaintext: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt, ITER, 'SHA-256')
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext)),
  )
  return JSON.stringify({
    v: 1, kdf: 'PBKDF2', iter: ITER, hash: 'SHA-256',
    salt: toB64(salt), iv: toB64(iv), ct: toB64(ct),
  })
}

export async function decryptString(envelope: string, password: string): Promise<string> {
  let data: { salt?: string; iv?: string; ct?: string; iter?: number; hash?: string }
  try {
    data = JSON.parse(envelope)
  } catch {
    throw new Error('INVALID_ENVELOPE')
  }
  if (!data || !data.salt || !data.iv || !data.ct) throw new Error('INVALID_ENVELOPE')
  try {
    const key = await deriveKey(password, fromB64(data.salt), data.iter ?? ITER, data.hash ?? 'SHA-256')
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
