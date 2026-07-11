import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // While the sheet is open, push a throwaway history entry so a mobile Back
  // gesture/button pops that entry (closing the sheet) instead of leaving the
  // app. A UI-driven close consumes the entry itself via history.back().
  useEffect(() => {
    if (!open) return
    let poppedByBack = false
    window.history.pushState({ __sheet: true }, '')
    const onPop = () => { poppedByBack = true; onCloseRef.current() }
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      if (!poppedByBack) window.history.back()
    }
  }, [open])

  if (!open) return null
  // Portal to <body> so ancestor transforms (e.g. animate-fade-in) don't
  // reposition this fixed overlay relative to the page box.
  return createPortal(
    <div className="fixed inset-0 z-40 flex items-end bg-ink/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full animate-slide-up rounded-t-4xl bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-line" />
        {children}
      </div>
    </div>,
    document.body,
  )
}
