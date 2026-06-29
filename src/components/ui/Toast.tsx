import { Icon } from './Icon'

export function Toast({ message, actionLabel, onAction, onDismiss }: { message: string; actionLabel?: string; onAction?: () => void; onDismiss: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex w-[92%] max-w-md animate-fade-in items-center justify-between gap-3 rounded-2xl bg-ink px-4 py-3 text-surface shadow-card">
      <span className="text-sm font-medium">{message}</span>
      <div className="flex items-center gap-3">
        {actionLabel && (
          <button className="whitespace-nowrap font-bold text-brand-soft" onClick={onAction}>{actionLabel}</button>
        )}
        <button aria-label="إغلاق" onClick={onDismiss} className="opacity-70 transition hover:opacity-100">
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  )
}
