const sizes = {
  sm: 'h-9 w-9 text-base rounded-xl',
  md: 'h-11 w-11 text-lg rounded-2xl',
  lg: 'h-14 w-14 text-2xl rounded-2xl',
}

/**
 * A colored rounded tile showing a category/account glyph (emoji or text).
 * `color` is a hex from stored data; we tint the background softly and keep
 * the glyph readable.
 */
export function IconBadge({
  icon,
  color,
  size = 'md',
}: {
  icon: string
  color?: string
  size?: keyof typeof sizes
}) {
  const tint = color ?? '#6D28D9'
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${sizes[size]}`}
      style={{ backgroundColor: `${tint}22`, color: tint }}
    >
      {icon}
    </span>
  )
}
