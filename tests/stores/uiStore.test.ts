import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../../src/stores/uiStore'

beforeEach(() => useUiStore.getState().resetFilter())

describe('uiStore', () => {
  it('sets and resets filter', () => {
    useUiStore.getState().setFilter({ type: 'expense' })
    expect(useUiStore.getState().filter.type).toBe('expense')
    useUiStore.getState().resetFilter()
    expect(useUiStore.getState().filter).toEqual({})
  })
  it('changes theme', () => {
    useUiStore.getState().setTheme('dark')
    expect(useUiStore.getState().theme).toBe('dark')
  })
})
