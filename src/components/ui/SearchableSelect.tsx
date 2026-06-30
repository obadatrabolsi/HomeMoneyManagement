import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'
import { t } from '../../i18n/ar'

export interface SelectOption {
  value: string
  label: string
  icon?: string
}

/**
 * A select with an inline search box. The options list expands in-flow (it does
 * not float), which keeps it fully visible inside a bottom sheet.
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = '—',
}: {
  options: SelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const selected = options.find((o) => o.value === value)
  const q = query.trim()
  const filtered = q ? options.filter((o) => o.label.includes(q)) : options

  const pick = (v: string) => {
    onChange(v)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input flex items-center justify-between gap-2 text-right"
      >
        <span className={selected ? 'text-ink' : 'text-muted'}>
          {selected ? `${selected.icon ? selected.icon + ' ' : ''}${selected.label}` : placeholder}
        </span>
        <Icon name="chevron-left" size={16} className={`text-muted transition ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-line bg-surface-2 p-2">
          <input
            autoFocus
            className="input mb-2"
            placeholder={t('search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="max-h-56 space-y-0.5 overflow-auto">
            <li>
              <button
                type="button"
                onClick={() => pick('')}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-muted transition hover:bg-surface"
              >
                {placeholder}
              </button>
            </li>
            {filtered.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => pick(o.value)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right transition hover:bg-surface
                    ${o.value === value ? 'bg-surface font-semibold text-brand' : 'text-ink'}`}
                >
                  {o.icon && <span>{o.icon}</span>}
                  <span className="truncate">{o.label}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-muted">{t('noData')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
