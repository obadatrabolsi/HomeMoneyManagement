import { Icon } from './Icon'

export function Fab({ onClick, label = 'إضافة' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-4 z-30 flex h-14 w-14 items-center justify-center
        rounded-full bg-grad-brand text-white shadow-brand transition active:scale-90
        focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/40"
    >
      <Icon name="plus" size={26} />
    </button>
  )
}
