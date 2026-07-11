import { useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, getSupabase } from '../../db/supabase'
import { onLogin, startAutoSync } from '../../sync/service'
import { CloudLoginScreen } from './CloudLoginScreen'

type GateState = 'loading' | 'authed' | 'anon'

/**
 * Mandatory login gate: the app is fully locked until the user signs in.
 * After first sign-in the Supabase session is persisted locally, so the app
 * re-opens on reload and keeps working offline until an explicit sign-out.
 *
 * When Supabase isn't configured (no env vars — e.g. a pure-offline build or
 * the test environment) there is no backend to authenticate against, so the
 * gate stays open and the app behaves exactly as before.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('loading')

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      if (import.meta.env.MODE === 'development') {
        console.warn(
          '[AuthGate] Supabase not configured — running offline-only, no login gate. ' +
          'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local and restart the dev server.',
        )
      }
      setState('authed')
      return
    }
    const sb = getSupabase()
    let mounted = true

    sb.auth.getSession().then(({ data }) => {
      if (mounted) setState(data.session ? 'authed' : 'anon')
    })

    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!mounted) return
      setState(session ? 'authed' : 'anon')
      // Adopt existing local data + first sync only on an actual sign-in.
      if (event === 'SIGNED_IN') void onLogin()
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (state === 'authed' && isSupabaseConfigured()) startAutoSync()
  }, [state])

  if (state === 'loading') return null
  if (state === 'anon') return <CloudLoginScreen />
  return <>{children}</>
}
