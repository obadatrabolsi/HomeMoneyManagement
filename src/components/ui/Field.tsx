import type { ReactNode } from 'react'

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {error && <span className="block text-xs font-medium text-expense">{error}</span>}
    </label>
  )
}
