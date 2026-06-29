export function GoalBar({ percent, reached }: { percent: number; reached: boolean }) {
  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
      <div
        className={`h-2 rounded-full ${reached ? 'bg-emerald-600' : 'bg-sky-500'}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  )
}
