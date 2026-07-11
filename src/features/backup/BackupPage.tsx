import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { exportBackup, importBackup } from '../../db/backupRepo'
import { encryptString, decryptString } from '../../lib/crypto'
import { transactionsToCsv, importTransactionsCsv } from '../../db/dataPortRepo'
import { updateSettings } from '../../db/settingsRepo'
import { db } from '../../db/schema'
import { applyTheme } from '../../lib/theme'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { Card } from '../../components/ui/Card'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { PinSettings } from '../lock/PinSettings'
import { t } from '../../i18n/ar'
import type { Settings } from '../../db/types'

export function BackupPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const csvFileRef = useRef<HTMLInputElement>(null)
  const encFileRef = useRef<HTMLInputElement>(null)
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

  const doExportCsv = async () => {
    const csv = await transactionsToCsv()
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    try {
      const res = await importTransactionsCsv(text)
      const summary = `${t('imported')}: ${res.imported} · ${t('skipped')}: ${res.skipped}`
      const detail = res.errors.length ? '\n' + res.errors.slice(0, 8).join('\n') + (res.errors.length > 8 ? '\n…' : '') : ''
      window.alert(summary + detail)
    } catch {
      window.alert('ملف غير صالح')
    } finally {
      if (csvFileRef.current) csvFileRef.current.value = ''
    }
  }

  const doExportEncrypted = async () => {
    const pw = window.prompt(t('enterPassword'))
    if (!pw) return
    const json = await exportBackup()
    const env = await encryptString(json, pw)
    const blob = new Blob([env], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `money-backup-${new Date().toISOString().slice(0, 10)}.enc.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const doImportEncrypted = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const pw = window.prompt(t('enterPassword'))
    if (!pw) return
    let json: string
    try {
      json = await decryptString(text, pw)
    } catch {
      window.alert(t('wrongPassword'))
      if (encFileRef.current) encFileRef.current.value = ''
      return
    }
    try {
      await importBackup(json)
      window.alert('تم الاستيراد')
    } catch {
      window.alert('ملف غير صالح')
    } finally {
      if (encFileRef.current) encFileRef.current.value = ''
    }
  }

  const handleThemeChange = async (newTheme: Settings['theme']) => {
    await updateSettings({ theme: newTheme })
    applyTheme(newTheme)
  }

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-xl font-bold text-ink">{t('settings')}</h1>
      <Card>
        <Field label={t('appearance')}>
          <SegmentedControl
            options={[
              { value: 'system', label: t('themeSystem') },
              { value: 'light', label: t('themeLight') },
              { value: 'dark', label: t('themeDark') },
            ]}
            value={theme}
            onChange={(v) => handleThemeChange(v as Settings['theme'])}
          />
        </Field>
      </Card>
      <Card title={t('settings')}>
        <nav className="flex flex-wrap gap-2">
          <Link to="/goals" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink">{t('goals')}</Link>
          <Link to="/budgets" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink">{t('budgets')}</Link>
          <Link to="/categories" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink">{t('categories')}</Link>
          <Link to="/recurring" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink">{t('recurring')}</Link>
          <Link to="/reports" className="rounded-full bg-surface-2 px-3.5 py-1.5 text-sm font-medium text-ink">{t('reports')}</Link>
        </nav>
      </Card>
      <div className="flex flex-col gap-2">
        <Button onClick={doExport}>{t('exportBackup')}</Button>
        <label
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-expense px-5 py-2.5 font-semibold text-white transition hover:brightness-105 active:scale-95"
        >
          {t('importBackup')}
          <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={doImport} />
        </label>
      </div>
      <Card title={t('dataPort')}>
        <div className="flex flex-col gap-2">
          <Button onClick={doExportCsv}>{t('exportCsv')}</Button>
          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand/10 px-5 py-2.5 font-semibold text-brand transition hover:bg-brand/15 active:scale-95">
            {t('importCsv')}
            <input ref={csvFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={doImportCsv} />
          </label>
        </div>
      </Card>
      <Card title={t('encryptedBackup')}>
        <div className="flex flex-col gap-2">
          <Button onClick={doExportEncrypted}>{t('exportEncrypted')}</Button>
          <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-brand/10 px-5 py-2.5 font-semibold text-brand transition hover:bg-brand/15 active:scale-95">
            {t('importEncrypted')}
            <input ref={encFileRef} type="file" accept=".json,.enc.json,application/octet-stream" className="hidden" onChange={doImportEncrypted} />
          </label>
        </div>
      </Card>
      <PinSettings />
      <p className="pt-2 text-center text-xs text-muted">
        {t('version')} {__APP_VERSION__}
      </p>
    </div>
  )
}
