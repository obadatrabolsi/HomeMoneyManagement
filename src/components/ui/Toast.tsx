export function Toast({ message, actionLabel, onAction, onDismiss }: { message: string; actionLabel?: string; onAction?: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-[92%] max-w-md items-center justify-between rounded-xl bg-gray-900 px-4 py-3 text-white shadow-lg">
      <span>{message}</span>
      <div className="flex items-center gap-3">
        {actionLabel && (
          <button className="font-bold text-emerald-400" onClick={onAction}>{actionLabel}</button>
        )}
        <button aria-label="إغلاق" onClick={onDismiss}>✕</button>
      </div>
    </div>
  )
}
