import type { ReactNode } from 'react'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full animate-slide-up rounded-t-4xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        {children}
      </div>
    </div>
  )
}
