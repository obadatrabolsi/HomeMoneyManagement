import { useEffect, useState, type ReactNode } from 'react'
import { isPinSet } from '../../db/lockRepo'
import { LockScreen } from './LockScreen'

export function LockGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'locked' | 'open'>('loading')
  useEffect(() => {
    isPinSet().then((set) => setState(set ? 'locked' : 'open'))
  }, [])
  if (state === 'loading') return null
  if (state === 'locked') return <LockScreen onUnlock={() => setState('open')} />
  return <>{children}</>
}
