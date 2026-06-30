# App Lock — PIN (Phase 3C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Optional app lock with a PIN — set/remove a PIN in settings; on app start a lock screen blocks access until the correct PIN is entered. Fully client-side.

**Architecture:** PIN stored as a PBKDF2 hash (salt + hash) in the singleton `Settings` (no schema bump — additive optional fields). A `lockRepo` (set/verify/clear/isSet) using Web Crypto. A `LockGate` wrapping the router renders a lock screen when a PIN is set and the session is locked. Settings page gains set/remove-PIN controls.

**Tech Stack:** Existing + Web Crypto (already used by the encrypted-backup feature). No new dependencies. Biometric/native lock is out of scope (needs Capacitor).

## Global Constraints

- PIN hashed via PBKDF2 (SHA-256, ≥150000 iters) with a random 16-byte salt; store base64 `pinSalt` + `pinHash` in `Settings`. Never store the raw PIN.
- No new Dexie tables; no `SCHEMA_VERSION` bump (the two new `Settings` fields are optional/additive).
- The lock is per page-load: once unlocked it stays unlocked until reload (state lives in the `LockGate` that wraps the router).
- UI matches current redesign conventions (`Card`, `Button`, `Field`, design tokens). Re-read shared files before editing; additive edits only; stage only your files (no `git add -A`); pre-commit hook auto-bumps `package.json` — let it run. A concurrent session may edit shared files.
- TDD for the repo; tests polyfill `crypto.subtle` with Node `webcrypto` (jsdom may lack it).
- Run commands from repo root `c:/Users/obada/source/repos/HomeMoneyManagement`.

---

### Task AL1: PIN hashing + lockRepo

**Files:**
- Modify: `src/lib/crypto.ts` (add `hashSecret`/`verifySecret`), `src/db/types.ts` (add `pinSalt?`/`pinHash?` to `Settings`)
- Create: `src/db/lockRepo.ts`
- Test: `tests/db/lockRepo.test.ts`

**Interfaces:**
- `hashSecret(secret: string, saltB64?: string): Promise<{ salt: string; hash: string }>` — PBKDF2→256-bit; random salt if none given; both base64.
- `verifySecret(secret: string, saltB64: string, hashB64: string): Promise<boolean>`
- `setPin(pin: string): Promise<void>` · `verifyPin(pin: string): Promise<boolean>` · `isPinSet(): Promise<boolean>` · `clearPin(): Promise<void>` (all via `Settings`).

- [ ] **Step 1: Write the failing test**

`tests/db/lockRepo.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lockRepo`
Expected: FAIL (module not found).

- [ ] **Step 3: Add hashing helpers to crypto.ts**

In `src/lib/crypto.ts`, reuse the existing `toB64`/`fromB64` and the PBKDF2 constants; ADD (export):
```ts
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
```

- [ ] **Step 4: Extend the Settings type**

In `src/db/types.ts`, add to `Settings`:
```ts
  pinSalt?: string
  pinHash?: string
```

- [ ] **Step 5: Write lockRepo**

`src/db/lockRepo.ts`:
```ts
import { getSettings, updateSettings } from './settingsRepo'
import { hashSecret, verifySecret } from '../lib/crypto'

export async function isPinSet(): Promise<boolean> {
  const s = await getSettings()
  return !!(s.pinSalt && s.pinHash)
}

export async function setPin(pin: string): Promise<void> {
  const { salt, hash } = await hashSecret(pin)
  await updateSettings({ pinSalt: salt, pinHash: hash })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const s = await getSettings()
  if (!s.pinSalt || !s.pinHash) return false
  return verifySecret(pin, s.pinSalt, s.pinHash)
}

export async function clearPin(): Promise<void> {
  await updateSettings({ pinSalt: undefined, pinHash: undefined })
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- lockRepo`
Expected: PASS.

> If `updateSettings` with `undefined` values doesn't remove the fields under Dexie, use `db.settings.update('singleton', { pinSalt: undefined, pinHash: undefined })` directly — confirm `clearPin` makes `isPinSet` return false (the test checks this).

- [ ] **Step 7: Run full suite + commit**

Run: `npm test` (all pass).
```bash
git add src/lib/crypto.ts src/db/types.ts src/db/lockRepo.ts tests/db/lockRepo.test.ts
git commit -m "feat: add PIN hashing and lock repository"
```

---

### Task AL2: LockGate + lock screen + settings PIN controls

**Files:**
- Create: `src/features/lock/LockGate.tsx`, `src/features/lock/LockScreen.tsx`, `src/features/lock/PinSettings.tsx`
- Modify: `src/App.tsx` (wrap router in `LockGate`), `src/features/backup/BackupPage.tsx` (render `PinSettings`), `src/i18n/ar.ts`
- Test: `tests/features/AppLock.test.tsx`

**Interfaces:**
- Consumes: `isPinSet`/`verifyPin`/`setPin`/`clearPin` (AL1); `Card`/`Button`/`Field` UI.
- Produces: `LockGate` (renders children unless a PIN is set and the session is locked, in which case it renders `LockScreen`); `LockScreen` (PIN entry → unlock); `PinSettings` (set/remove PIN on the settings page).

> Re-READ `src/App.tsx`, `src/features/backup/BackupPage.tsx`, `src/i18n/ar.ts`, and the `src/components/ui/` primitives FIRST. Additive edits; leave concurrent-session changes untouched.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/ar.ts` add to `strings` (only missing):
```ts
  appLock: 'قفل التطبيق',
  pin: 'رمز PIN',
  setPin: 'تعيين رمز',
  removePin: 'إزالة الرمز',
  confirmPin: 'تأكيد الرمز',
  unlock: 'فتح',
  enterPin: 'أدخل الرمز',
  wrongPin: 'رمز غير صحيح',
  pinMismatch: 'الرمزان غير متطابقين',
```

- [ ] **Step 2: Write the failing test**

`tests/features/AppLock.test.tsx`:
```tsx
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- AppLock`
Expected: FAIL (module not found).

- [ ] **Step 4: Write LockScreen**

`src/features/lock/LockScreen.tsx`:
```tsx
import { useState } from 'react'
import { verifyPin } from '../../db/lockRepo'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await verifyPin(pin)) onUnlock()
    else { setError(t('wrongPin')); setPin('') }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3 text-center">
        <h1 className="text-lg font-bold text-ink">{t('appLock')}</h1>
        <Field label={t('enterPin')}>
          <input aria-label={t('enterPin')} type="password" inputMode="numeric"
            className="w-full rounded-lg border p-2 text-center" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </Field>
        {error && <p className="text-sm text-expense">{error}</p>}
        <Button type="submit" className="w-full">{t('unlock')}</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 5: Write LockGate**

`src/features/lock/LockGate.tsx`:
```tsx
import { useEffect, useState, type ReactNode } from 'react'
import { isPinSet } from '../../db/lockRepo'
import { LockScreen } from './LockScreen'

export function LockGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'locked' | 'open'>('loading')
  useEffect(() => {
    isPinSet().then((set) => setState(set ? 'locked' : 'open'))
  }, [])
  if (state === 'loading') return null
  if (state === 'locked') return <LockScreen onUnlock={() => setState('open')} />
  return <>{children}</>
}
```

- [ ] **Step 6: Wrap the router in App.tsx**

In `src/App.tsx`, import `LockGate` and wrap the `<HashRouter>…</HashRouter>` with `<LockGate>…</LockGate>` (LockGate outside the router so it gates the whole app).

- [ ] **Step 7: Write PinSettings and add to the settings page**

`src/features/lock/PinSettings.tsx`:
```tsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { setPin, clearPin, verifyPin } from '../../db/lockRepo'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

export function PinSettings() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), [], undefined)
  const hasPin = !!(settings?.pinSalt && settings?.pinHash)
  const [pin, setPinVal] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const doSet = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pin.length < 4) { setError(t('wrongPin')); return }
    if (pin !== confirm) { setError(t('pinMismatch')); return }
    await setPin(pin); setPinVal(''); setConfirm('')
  }
  const doRemove = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (await verifyPin(pin)) { await clearPin(); setPinVal('') }
    else setError(t('wrongPin'))
  }

  return (
    <Card title={t('appLock')}>
      {hasPin ? (
        <form onSubmit={doRemove} className="space-y-2">
          <Field label={t('enterPin')}>
            <input aria-label={t('removePin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={pin} onChange={(e) => setPinVal(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button type="submit">{t('removePin')}</Button>
        </form>
      ) : (
        <form onSubmit={doSet} className="space-y-2">
          <Field label={t('pin')}>
            <input aria-label={t('setPin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={pin} onChange={(e) => setPinVal(e.target.value)} />
          </Field>
          <Field label={t('confirmPin')}>
            <input aria-label={t('confirmPin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button type="submit">{t('setPin')}</Button>
        </form>
      )}
    </Card>
  )
}
```
In `src/features/backup/BackupPage.tsx`, import `PinSettings` and render `<PinSettings />` as one of the cards (additive).

- [ ] **Step 8: Run tests + build**

Run: `npm test -- AppLock` then `npm run build`
Expected: PASS; compiles. Full suite: `npm test` — all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/features/lock src/App.tsx src/features/backup/BackupPage.tsx src/i18n/ar.ts tests/features/AppLock.test.tsx
git commit -m "feat: add optional PIN app lock with lock screen and settings control"
```

---

## Self-Review

**Spec coverage:** PIN hashing (PBKDF2) + lockRepo set/verify/clear/isSet (AL1) ✓; LockGate lock screen gating the app + set/remove PIN settings control + i18n (AL2) ✓. No schema bump (additive Settings fields) ✓. Biometric/native lock explicitly out of scope.

**Placeholder scan:** none — full code throughout.

**Type consistency:** `hashSecret`/`verifySecret` (crypto) used by lockRepo; `isPinSet`/`verifyPin`/`setPin`/`clearPin` defined in AL1, consumed by LockGate/LockScreen/PinSettings; `Settings.pinSalt/pinHash` added in AL1, read in AL2.

---

## Execution Handoff

Execute via superpowers:subagent-driven-development.
