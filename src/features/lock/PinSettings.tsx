import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { setPin, clearPin, verifyPin } from '../../db/lockRepo'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

export function PinSettings() {
  const settings = useLiveQuery(() => db.settings.get('singleton'), [], undefined)
  const hasPin = !!(settings?.pinSalt && settings?.pinHash)
  const [pin, setPinVal] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const doSet = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pin.length < 4) { setError(t('wrongPin')); return }
    if (pin !== confirm) { setError(t('pinMismatch')); return }
    await setPin(pin); setPinVal(''); setConfirm('')
  }
  const doRemove = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (await verifyPin(pin)) { await clearPin(); setPinVal('') }
    else setError(t('wrongPin'))
  }

  return (
    <Card title={t('appLock')}>
      {hasPin ? (
        <form onSubmit={doRemove} className="space-y-2">
          <Field label={t('enterPin')}>
            <input aria-label={t('removePin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={pin} onChange={(e) => setPinVal(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button type="submit">{t('removePin')}</Button>
        </form>
      ) : (
        <form onSubmit={doSet} className="space-y-2">
          <Field label={t('pin')}>
            <input aria-label={t('setPin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={pin} onChange={(e) => setPinVal(e.target.value)} />
          </Field>
          <Field label={t('confirmPin')}>
            <input aria-label={t('confirmPin')} type="password" inputMode="numeric" className="w-full rounded-lg border p-2"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-expense">{error}</p>}
          <Button type="submit">{t('setPin')}</Button>
        </form>
      )}
    </Card>
  )
}
