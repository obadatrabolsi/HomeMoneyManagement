import { seedDefaultCategories } from '../db/categoriesRepo'
import { migrateLegacyAccountIcons } from '../db/accountsRepo'
import { getSettings } from '../db/settingsRepo'
import { applyTheme } from '../lib/theme'

export async function bootstrap(): Promise<void> {
  await seedDefaultCategories()
  await migrateLegacyAccountIcons()
  const settings = await getSettings()
  applyTheme(settings.theme)
}
