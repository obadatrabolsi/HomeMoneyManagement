import { describe, it, expect } from 'vitest'
import { toCsv, parseCsv } from '../../src/lib/csv'

describe('csv', () => {
  it('builds simple rows', () => {
    expect(toCsv([['a', 'b'], ['c', 'd']])).toBe('a,b\r\nc,d')
  })
  it('quotes fields with commas, quotes, and newlines', () => {
    expect(toCsv([['x,y', 'he said "hi"', 'line1\nline2']]))
      .toBe('"x,y","he said ""hi""","line1\nline2"')
  })
  it('parses simple rows', () => {
    expect(parseCsv('a,b\r\nc,d')).toEqual([['a', 'b'], ['c', 'd']])
  })
  it('parses quoted fields with commas, escaped quotes, and newlines', () => {
    expect(parseCsv('"x,y","he said ""hi""","line1\nline2"'))
      .toEqual([['x,y', 'he said "hi"', 'line1\nline2']])
  })
  it('strips a BOM and ignores a trailing newline', () => {
    expect(parseCsv('﻿a,b\r\n')).toEqual([['a', 'b']])
  })
  it('round-trips', () => {
    const rows = [['date', 'notes'], ['2026-06-01', 'café, "x"\nnext']]
    expect(parseCsv(toCsv(rows))).toEqual(rows)
  })
})
