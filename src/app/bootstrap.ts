import { seedDefaultCategories } from '../db/categoriesRepo'
import { getSettings } from '../db/settingsRepo'
import { processDueRules } from '../db/recurringRepo'
import { isoDate } from '../lib/date'

export async function bootstrap(): Promise<void> {
  await seedDefaultCategories()
  const settings = await getSettings()
  const root = document.documentElement
  const dark =
    settings.theme === 'dark' ||
    (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  try {
    await processDueRules(isoDate(new Date()))
  } catch (err) {
    console.error('recurring generation failed', err)
  }
}
