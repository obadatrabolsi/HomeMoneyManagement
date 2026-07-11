import { describe, it, expect } from 'vitest'
import { summarizeTransactions } from '../../src/lib/txSummary'
import type { Transaction } from '../../src/db/types'

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    type: 'expense',
    amount: 0,
    accountId: 'a',
    date: '2026-07-01',
    tags: [],
    createdAt: '', updatedAt: '',
    ...partial,
  }
}

describe('summarizeTransactions', () => {
  it('groups income/expense/net per account currency and counts rows', () => {
    const accCur = { a: 'EUR', b: 'USD' }
    const txs = [
      tx({ type: 'income', amount: 1000, accountId: 'a' }),
      tx({ type: 'expense', amount: 400, accountId: 'a' }),
      tx({ type: 'income', amount: 5000, accountId: 'b' }),
    ]
    const s = summarizeTransactions(txs, accCur)
    expect(s.count).toBe(3)
    expect(s.byCurrency.EUR).toEqual({ income: 1000, expense: 400, net: 600 })
    expect(s.byCurrency.USD).toEqual({ income: 5000, expense: 0, net: 5000 })
  })

  it('excludes transfers from income/expense/net but still counts them', () => {
    const accCur = { a: 'EUR' }
    const txs = [
      tx({ type: 'expense', amount: 400, accountId: 'a' }),
      tx({ type: 'transfer', amount: 999, accountId: 'a', transferDirection: 'out' }),
    ]
    const s = summarizeTransactions(txs, accCur)
    expect(s.count).toBe(2)
    expect(s.byCurrency.EUR).toEqual({ income: 0, expense: 400, net: -400 })
  })

  it('returns an empty summary for no transactions', () => {
    expect(summarizeTransactions([], {})).toEqual({ count: 0, byCurrency: {} })
  })
})
