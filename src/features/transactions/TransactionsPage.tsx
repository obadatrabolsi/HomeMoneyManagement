import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { queryTransactions, undoDelete } from '../../db/transactionsRepo'
import { useUiStore } from '../../stores/uiStore'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { Toast } from '../../components/ui/Toast'
import { t } from '../../i18n/ar'

export function TransactionsPage() {
  const filter = useUiStore((s) => s.filter)
  const setFilter = useUiStore((s) => s.setFilter)
  const [undoIds, setUndoIds] = useState<string[] | null>(null)
  const txs = useLiveQuery(() => queryTransactions(filter), [JSON.stringify(filter)], [])

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">{t('transactions')}</h1>
      <input
        className="w-full rounded-lg border p-2"
        placeholder={t('search')}
        value={filter.text ?? ''}
        onChange={(e) => setFilter({ text: e.target.value })}
      />
      {txs.length === 0 && <EmptyState message={t('noData')} />}
      {txs.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} onDeleted={(ids) => setUndoIds(ids)} />
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
