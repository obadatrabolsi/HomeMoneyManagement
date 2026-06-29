import type { ReactNode } from 'react'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white p-4 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
