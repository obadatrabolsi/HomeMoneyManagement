# Encrypted Backup (Phase 3B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let users export/import a password-encrypted backup, fully client-side via the Web Crypto API.

**Architecture:** A `crypto` lib (`encryptString`/`decryptString` using PBKDF2-derived AES-GCM) and encrypted export/import controls on the settings page that wrap the existing `exportBackup`/`importBackup` JSON.

**Tech Stack:** Existing + Web Crypto (`globalThis.crypto.subtle`). No new npm dependencies.

## Global Constraints

- Encryption: AES-GCM 256-bit; key derived via PBKDF2 (SHA-256, ≥150000 iterations) from the password + a random 16-byte salt; random 12-byte IV per encryption.
- Envelope format: a JSON string `{ v: 1, kdf: 'PBKDF2', iter, hash: 'SHA-256', salt, iv, ct }` with `salt`/`iv`/`ct` base64-encoded. Self-describing so decryption needs only the envelope + password.
- Wrong password (GCM auth failure) → throw `Error('DECRYPT_FAILED')`; malformed envelope → `Error('INVALID_ENVELOPE')`.
- No new Dexie tables, no schema bump. The plaintext is exactly the existing `exportBackup()` JSON; decryption feeds `importBackup()`.
- UI matches current redesign conventions (`Card`, `Button`, design tokens). Re-read shared files before editing; stage only your files (no `git add -A`); a pre-commit hook auto-bumps `package.json` — let it run. A concurrent session may edit shared files.
- TDD for the crypto lib; tests must make `crypto.subtle` available (jsdom may lack it — polyfill with Node's `webcrypto` in the test).
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task EB1: crypto library (encryptString/decryptString)

**Files:**
- Create: `src/lib/crypto.ts`
- Test: `tests/lib/crypto.test.ts`

**Interfaces:**
- Produces:
  - `encryptString(plaintext: string, password: string): Promise<string>` — returns the JSON envelope string.
  - `decryptString(envelope: string, password: string): Promise<string>` — returns the original plaintext; throws `DECRYPT_FAILED`/`INVALID_ENVELOPE`.

- [ ] **Step 1: Write the failing test**

`tests/lib/crypto.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- crypto`
Expected: FAIL (module not found).

- [ ] **Step 3: Write minimal implementation**

`src/lib/crypto.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- crypto`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/crypto.ts tests/lib/crypto.test.ts
git commit -m "feat: add Web Crypto password-based string encryption"
```

---

### Task EB2: Encrypted export/import UI

**Files:**
- Modify: `src/features/backup/BackupPage.tsx`, `src/i18n/ar.ts`
- Test: `tests/features/EncryptedBackup.test.tsx`

**Interfaces:**
- Consumes: `encryptString`/`decryptString` (EB1), existing `exportBackup`/`importBackup`, `Card`/`Button`/`Field` UI.
- Produces: an "encrypted backup" card on the settings page — export (prompt password, encrypt the backup JSON, download) and import (prompt password, decrypt, import) — with error feedback.

> Re-READ `src/features/backup/BackupPage.tsx`, `src/i18n/ar.ts`, and the `src/components/ui/` primitives FIRST. Make additive edits; leave any concurrent-session changes untouched.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings` (only missing keys):
```ts
  encryptedBackup: 'نسخة احتياطية مشفّرة',
  exportEncrypted: 'تصدير مشفّر',
  importEncrypted: 'استيراد مشفّر',
  enterPassword: 'أدخل كلمة المرور',
  wrongPassword: 'كلمة المرور غير صحيحة أو الملف تالف',
```

- [ ] **Step 2: Write the failing test**

`tests/features/EncryptedBackup.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../../src/db/schema'
import { BackupPage } from '../../src/features/backup/BackupPage'

beforeEach(async () => { await db.delete(); await db.open() })

describe('Encrypted backup UI', () => {
  it('shows encrypted export and import controls', async () => {
    render(<MemoryRouter><BackupPage /></MemoryRouter>)
    expect(await screen.findByText('تصدير مشفّر')).toBeInTheDocument()
    expect(screen.getByText('استيراد مشفّر')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- EncryptedBackup`
Expected: FAIL (controls absent).

- [ ] **Step 4: Add the encrypted-backup card to BackupPage**

Add a `Card` titled `t('encryptedBackup')` with:
- an "export encrypted" `Button`: `const pw = window.prompt(t('enterPassword')); if (!pw) return; const json = await exportBackup(); const env = await encryptString(json, pw);` then download `env` as a `Blob` (`type: 'application/octet-stream'`) named `money-backup-<yyyy-MM-dd>.enc.json` (mirror existing download logic).
- an "import encrypted" file input (`accept=".json,.enc.json,application/octet-stream"`): read text, `const pw = window.prompt(t('enterPassword')); if (!pw) return;` then `try { const json = await decryptString(text, pw); await importBackup(json); window.alert('تم الاستيراد') } catch { window.alert(t('wrongPassword')) }`. Reset the input after.

Import `encryptString`, `decryptString` from `../../lib/crypto`.

- [ ] **Step 5: Run tests + build**

Run: `npm test -- EncryptedBackup` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/backup/BackupPage.tsx src/i18n/ar.ts tests/features/EncryptedBackup.test.tsx
git commit -m "feat: add encrypted backup export/import UI"
```

---

## Self-Review

**Spec coverage:** password-based AES-GCM encrypt/decrypt with PBKDF2 + self-describing envelope + error cases (EB1) ✓; encrypted export/import wired to existing backup JSON on the settings page (EB2) ✓. No schema/backup-format change to the underlying data ✓.

**Placeholder scan:** none — EB1 full code; EB2 concrete steps mirroring the existing block.

**Type consistency:** `encryptString`/`decryptString` defined in EB1, consumed in EB2.

---

## Execution Handoff

Execute via superpowers:subagent-driven-development.
