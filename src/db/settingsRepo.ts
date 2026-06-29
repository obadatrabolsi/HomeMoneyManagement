import { db } from './schema'
import { SCHEMA_VERSION } from './schema'
import type { Settings } from './types'

const DEFAULTS: Settings = {
  id: 'singleton',
  defaultCurrency: 'EUR',
  theme: 'system',
  schemaVersion: SCHEMA_VERSION,
}

export async function getSettings(): Promise<Settings> {
  const existing = await db.settings.get('singleton')
  if (existing) return existing
  await db.settings.put(DEFAULTS)
  return DEFAULTS
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await getSettings()
  await db.settings.update('singleton', patch)
}
