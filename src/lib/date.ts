import { format, startOfMonth, endOfMonth } from 'date-fns'

export function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function todayRange(now: Date): { start: string; end: string } {
  const s = isoDate(now)
  return { start: s, end: s }
}

export function monthRange(now: Date): { start: string; end: string } {
  return { start: isoDate(startOfMonth(now)), end: isoDate(endOfMonth(now)) }
}

export function isoMonth(d: Date): string {
  return format(d, 'yyyy-MM')
}
