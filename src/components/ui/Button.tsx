import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost' | 'danger' | 'soft'

const styles: Record<Variant, string> = {
  primary: 'bg-grad-brand text-white shadow-brand hover:brightness-105',
  soft: 'bg-brand/10 text-brand hover:bg-brand/15',
  ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-expense text-white hover:brightness-105',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-semibold transition
        active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40
        disabled:opacity-50 disabled:active:scale-100 ${styles[variant]} ${className}`}
    />
  )
}
