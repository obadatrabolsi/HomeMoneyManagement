export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={`flex gap-1 rounded-full bg-surface-2 p-1 ${className}`} role="tablist">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition
              ${active ? 'bg-surface text-brand shadow-soft' : 'text-muted hover:text-ink'}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
