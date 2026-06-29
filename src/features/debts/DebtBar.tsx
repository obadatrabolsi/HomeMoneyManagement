export function DebtBar({ percent, settled }: { percent: number; settled: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${settled ? 'bg-emerald-600' : 'bg-amber-500'}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
