import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export function Card({
  title,
  action,
  actionTo,
  actionLabel,
  className = '',
  children,
}: {
  title?: string
  action?: ReactNode
  actionTo?: string
  actionLabel?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`rounded-3xl bg-surface p-4 shadow-soft ${className}`}>
      {(title || action || actionTo) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h2 className="text-sm font-semibold text-muted">{title}</h2>}
          {action}
          {actionTo && (
            <Link to={actionTo} className="text-xs font-semibold text-brand">
              {actionLabel}
            </Link>
          )}
        </div>
      )}
      {children}
    </section>
  )
}
