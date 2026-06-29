export type ProgressTone = 'brand' | 'income' | 'expense' | 'warning' | 'transfer'

const fill: Record<ProgressTone, string> = {
  brand: 'bg-grad-brand',
  income: 'bg-income',
  expense: 'bg-expense',
  warning: 'bg-warning',
  transfer: 'bg-transfer',
}

export function ProgressBar({ percent, tone = 'brand' }: { percent: number; tone?: ProgressTone }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${fill[tone]}`}
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  )
}
