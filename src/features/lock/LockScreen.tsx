import { useState } from 'react'
import { verifyPin } from '../../db/lockRepo'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (await verifyPin(pin)) onUnlock()
    else { setError(t('wrongPin')); setPin('') }
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3 text-center">
        <h1 className="text-lg font-bold text-ink">{t('appLock')}</h1>
        <Field label={t('enterPin')}>
          <input aria-label={t('enterPin')} type="password" inputMode="numeric"
            className="w-full rounded-lg border p-2 text-center" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus />
        </Field>
        {error && <p className="text-sm text-expense">{error}</p>}
        <Button type="submit" className="w-full">{t('unlock')}</Button>
      </form>
    </div>
  )
}
