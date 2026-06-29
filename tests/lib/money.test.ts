import { describe, it, expect } from 'vitest'
import { toCents, fromCents, formatMoney, parseAmount } from '../../src/lib/money'

describe('money', () => {
  it('converts major units to integer cents', () => {
    expect(toCents(12.34)).toBe(1234)
    expect(toCents(0.1)).toBe(10)
    expect(toCents(0.005)).toBe(1) // rounds half up
  })
  it('converts cents back to major units', () => {
    expect(fromCents(1234)).toBe(12.34)
  })
  it('parses user amount strings to cents', () => {
    expect(parseAmount('12.5')).toBe(1250)
    expect(parseAmount('1٬234.50')).toBe(123450) // arabic thousands sep stripped
    expect(() => parseAmount('abc')).toThrow()
    expect(parseAmount('12,50')).toBe(1250)   // comma as decimal when no dot present
    expect(parseAmount('12٫5')).toBe(1250)    // arabic decimal separator
  })
  it('formats cents with currency', () => {
    expect(formatMoney(123450, 'EUR')).toContain('1') // smoke: non-empty localized
    expect(formatMoney(0, 'EUR')).toBeTruthy()
  })
})
