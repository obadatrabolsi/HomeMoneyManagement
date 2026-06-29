const barColor: Record<'ok' | 'near' | 'over', string> = {
  ok: 'bg-emerald-500',
  near: 'bg-amber-500',
  over: 'bg-red-500',
}

export function BudgetBar({ percent, status }: { percent: number; status: 'ok' | 'near' | 'over' }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${barColor[status]}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
