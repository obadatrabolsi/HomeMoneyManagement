import { useState } from 'react'
import { getSupabase } from '../../db/supabase'
import { Button } from '../../components/ui/Button'
import { Field } from '../../components/ui/Field'
import { t } from '../../i18n/ar'

/** Default account for this single-user install. */
const DEFAULT_EMAIL = 'obada.trabolsi@gmail.com'

export function CloudLoginScreen() {
  const [email, setEmail] = useState(DEFAULT_EMAIL)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    setBusy(false)
    // On success, AuthGate's onAuthStateChange flips the app open.
    if (error) setError(t('loginFailed'))
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="w-full max-w-xs space-y-3 text-center">
        <h1 className="text-lg font-bold text-ink">{t('appName')}</h1>
        <p className="text-sm text-muted">{t('loginTitle')}</p>
        <Field label={t('email')}>
          <input
            aria-label={t('email')} type="email" autoComplete="username" dir="ltr"
            className="w-full rounded-lg border p-2 text-center"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label={t('password')}>
          <input
            aria-label={t('password')} type="password" autoComplete="current-password" dir="ltr"
            className="w-full rounded-lg border p-2 text-center"
            value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
        </Field>
        {error && <p className="text-sm text-expense">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? t('signingIn') : t('login')}
        </Button>
      </form>
    </div>
  )
}
