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
