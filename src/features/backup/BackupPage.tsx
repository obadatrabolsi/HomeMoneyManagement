import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { exportBackup, importBackup } from '../../db/backupRepo'
import { updateSettings } from '../../db/settingsRepo'
import { db } from '../../db/schema'
import { applyTheme } from '../../lib/theme'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'
import type { Settings } from '../../db/types'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const data = useLiveQuery(() => db.settings.get('singleton'), [], undefined)
  const theme = data?.theme ?? 'system'

  const doExport = async () => {
    const json = await exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!window.confirm(t('importWarning'))) return
    const text = await file.text()
    try {
      await importBackup(text)
      window.alert('تم الاستيراد')
    } catch {
      window.alert('ملف غير صالح')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleThemeChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTheme = e.target.value as Settings['theme']
    await updateSettings({ theme: newTheme })
    applyTheme(newTheme)
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('settings')}</h1>
      <Field label={t('appearance')}>
        <select
          value={theme}
          onChange={handleThemeChange}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
        >
          <option value="system">{t('themeSystem')}</option>
          <option value="light">{t('themeLight')}</option>
          <option value="dark">{t('themeDark')}</option>
        </select>
      </Field>
      <nav className="flex flex-wrap gap-2">
        <Link to="/goals" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('goals')}</Link>
        <Link to="/budgets" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('budgets')}</Link>
        <Link to="/categories" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('categories')}</Link>
        <Link to="/recurring" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('recurring')}</Link>
        <Link to="/debts" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('debts')}</Link>
        <Link to="/reports" className="rounded-lg bg-gray-100 px-3 py-1 text-sm dark:bg-gray-800">{t('reports')}</Link>
      </nav>
      <Button onClick={doExport}>{t('exportBackup')}</Button>
      <div>
        <label className="inline-block cursor-pointer rounded-xl bg-gray-200 px-4 py-2 dark:bg-gray-800">
          {t('importBackup')}
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
        </label>
      </div>
    </div>
  )
}
