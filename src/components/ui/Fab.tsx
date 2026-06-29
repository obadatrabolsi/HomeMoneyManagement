import type { ReactNode } from 'react'

export function Fab({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-2xl text-white shadow-lg"
      aria-label="إضافة"
    >
      {children}
    </button>
  )
}
