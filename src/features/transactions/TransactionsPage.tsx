import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { queryTransactions, undoDelete } from '../../db/transactionsRepo'
import { listAccounts } from '../../db/accountsRepo'
import { useUiStore } from '../../stores/uiStore'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { Toast } from '../../components/ui/Toast'
import { t } from '../../i18n/ar'
import type { Transaction } from '../../db/types'

export function TransactionsPage() {
  const filter = useUiStore((s) => s.filter)
  const setFilter = useUiStore((s) => s.setFilter)
  const [undoIds, setUndoIds] = useState<string[] | null>(null)
  const result = useLiveQuery(async () => {
    const [txs, accounts] = await Promise.all([queryTransactions(filter), listAccounts()])
    const accCur: Record<string, string> = {}
    for (const a of accounts) accCur[a.id] = a.currency
    return { txs, accCur }
  }, [JSON.stringify(filter)], { txs: [] as Transaction[], accCur: {} as Record<string, string> })
  const { txs, accCur } = result

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-xl font-bold text-ink">{t('transactions')}</h1>
      <input
        className="input"
        placeholder={t('search')}
        value={filter.text ?? ''}
        onChange={(e) => setFilter({ text: e.target.value })}
      />
      {txs.length === 0 && <EmptyState message={t('noData')} emoji="🧾" />}
      {txs.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} currency={accCur[tx.accountId] ?? 'EUR'} onDeleted={(ids) => setUndoIds(ids)} />
      ))}
      {undoIds && (
        <Toast
          message={t('deleted')}
          actionLabel={t('undo')}
          onAction={async () => { await undoDelete(undoIds); setUndoIds(null) }}
          onDismiss={() => setUndoIds(null)}
        />
      )}
    </div>
  )
}
