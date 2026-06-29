import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../src/db/schema'
import { getSettings, updateSettings } from '../../src/db/settingsRepo'

beforeEach(async () => { await db.delete(); await db.open() })

describe('settingsRepo', () => {
  it('seeds defaults on first read', async () => {
    const s = await getSettings()
    expect(s.defaultCurrency).toBe('EUR')
    expect(s.theme).toBe('system')
  })
  it('updates settings', async () => {
    await getSettings()
    await updateSettings({ theme: 'dark' })
    expect((await getSettings()).theme).toBe('dark')
  })
})
