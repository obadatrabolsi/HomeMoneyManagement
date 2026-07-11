import type { Transaction } from '../db/types'

export interface CurrencyTotals { income: number; expense: number; net: number }
export interface TxSummary { count: number; byCurrency: Record<string, CurrencyTotals> }

/**
 * Summarise a list of (already filtered) transactions per account currency.
 * Transfers are counted as rows but excluded from income/expense/net, since
 * they only move money between the user's own accounts.
 */
export function summarizeTransactions(
  txs: Transaction[],
  accCur: Record<string, string>,
): TxSummary {
  const byCurrency: Record<string, CurrencyTotals> = {}
  for (const tx of txs) {
    if (tx.type !== 'income' && tx.type !== 'expense') continue
    const cur = accCur[tx.accountId] ?? 'EUR'
    const c = (byCurrency[cur] ??= { income: 0, expense: 0, net: 0 })
    if (tx.type === 'income') { c.income += tx.amount; c.net += tx.amount }
    else { c.expense += tx.amount; c.net -= tx.amount }
  }
  return { count: txs.length, byCurrency }
}
