import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { queryTransactions, undoDelete } from '../../db/transactionsRepo'
import { transactionIdsWithAttachments } from '../../db/attachmentsRepo'
import { listAccounts } from '../../db/accountsRepo'
import { useUiStore } from '../../stores/uiStore'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { Toast } from '../../components/ui/Toast'
import { t } from '../../i18n/ar'
import type { Transaction, Account } from '../../db/types'

export function TransactionsPage() {
  const filter = useUiStore((s) => s.filter)
  const setFilter = useUiStore((s) => s.setFilter)
  const [undoIds, setUndoIds] = useState<string[] | null>(null)
  const result = useLiveQuery(async () => {
    const [txs, accounts, attachSet] = await Promise.all([queryTransactions(filter), listAccounts(), transactionIdsWithAttachments()])
    const accCur: Record<string, string> = {}
    const accName: Record<string, string> = {}
    for (const a of accounts) { accCur[a.id] = a.currency; accName[a.id] = a.name }
    return { txs, accCur, accName, accounts, attachSet }
  }, [JSON.stringify(filter)], { txs: [] as Transaction[], accCur: {} as Record<string, string>, accName: {} as Record<string, string>, accounts: [] as Account[], attachSet: new Set<string>() })
  const { txs, accCur, accName, accounts, attachSet } = result

  return (
    <div className="animate-fade-in space-y-4">
      <h1 className="text-xl font-bold text-ink">{t('transactions')}</h1>
      <input
        className="input"
        placeholder={t('search')}
        value={filter.text ?? ''}
        onChange={(e) => setFilter({ text: e.target.value })}
      />
      <select
        className="input"
        aria-label={t('account')}
        value={filter.accountId ?? ''}
        onChange={(e) => setFilter({ accountId: e.target.value || undefined })}
      >
        <option value="">{t('allAccounts')}</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      {txs.length === 0 && <EmptyState message={t('noData')} emoji="🧾" />}
      {txs.map((tx) => (
        <TransactionRow key={tx.id} tx={tx} currency={accCur[tx.accountId] ?? 'EUR'} accountName={accName[tx.accountId]} onDeleted={(ids) => setUndoIds(ids)} hasAttachment={attachSet.has(tx.id)} />
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
