import { describe, it, expect } from 'vitest'
import { todayRange, monthRange, isoDate } from '../../src/lib/date'

describe('date helpers', () => {
  const now = new Date('2026-06-15T13:00:00')
  it('formats iso date', () => {
    expect(isoDate(now)).toBe('2026-06-15')
  })
  it('computes today range', () => {
    expect(todayRange(now)).toEqual({ start: '2026-06-15', end: '2026-06-15' })
  })
  it('computes month range', () => {
    expect(monthRange(now)).toEqual({ start: '2026-06-01', end: '2026-06-30' })
  })
})
