import { useRef } from 'react'
import { exportBackup, importBackup } from '../../db/backupRepo'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)

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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t('settings')}</h1>
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
