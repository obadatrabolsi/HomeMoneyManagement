import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** True when the app was built with Supabase credentials (env vars set). */
export function isSupabaseConfigured(): boolean {
  return !!(url && anonKey)
}

let client: SupabaseClient | null = null

/** Lazily created singleton Supabase client. Persists the session locally so
 *  the user stays logged in across reloads and can work offline after first login. */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED')
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'hmm-auth',
      },
    })
  }
  return client
}

/** The id of the signed-in user, or null. Reads the cached session (no network). */
export async function currentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null
  const { data } = await getSupabase().auth.getSession()
  return data.session?.user.id ?? null
}
