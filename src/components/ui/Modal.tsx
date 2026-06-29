import type { ReactNode } from 'react'

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-4 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  )
}
