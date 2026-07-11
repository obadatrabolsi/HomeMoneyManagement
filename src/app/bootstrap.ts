import { seedDefaultCategories, dedupeCategories } from '../db/categoriesRepo'
import { migrateLegacyAccountIcons } from '../db/accountsRepo'
import { getSettings } from '../db/settingsRepo'
import { applyTheme } from '../lib/theme'

export async function bootstrap(): Promise<void> {
  await seedDefaultCategories()
  // Each device seeds the default categories with its own random ids, so syncing
  // two devices duplicates them. Fold any duplicates back into one.
  await dedupeCategories()
  await migrateLegacyAccountIcons()
  const settings = await getSettings()
  applyTheme(settings.theme)
}
