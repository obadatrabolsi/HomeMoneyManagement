import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('has indexedDB available in tests', () => {
    expect(typeof indexedDB).toBe('object')
  })
})
