import { seedDefaultCategories } from '../db/categoriesRepo'
import { getSettings } from '../db/settingsRepo'
import { applyTheme } from '../lib/theme'

export async function bootstrap(): Promise<void> {
  await seedDefaultCategories()
  const settings = await getSettings()
  applyTheme(settings.theme)
}
