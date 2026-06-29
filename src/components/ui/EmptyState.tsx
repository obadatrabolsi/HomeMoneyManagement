import type { ReactNode } from 'react'

export function EmptyState({ message, emoji = '✨', action }: { message: string; emoji?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-2 text-3xl">
        {emoji}
      </div>
      <p className="max-w-[16rem] text-sm font-medium text-muted">{message}</p>
      {action}
    </div>
  )
}
