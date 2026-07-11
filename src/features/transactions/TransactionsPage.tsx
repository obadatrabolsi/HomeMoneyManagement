import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { queryTransactions, undoDelete } from '../../db/transactionsRepo'
import { transactionIdsWithAttachments } from '../../db/attachmentsRepo'
import { listAccounts, resolveDefaultAccountId } from '../../db/accountsRepo'
import { useUiStore } from '../../stores/uiStore'
import { summarizeTransactions } from '../../lib/txSummary'
import { formatMoney } from '../../lib/money'
import { TransactionRow } from './TransactionRow'
import { EmptyState } from '../../components/ui/EmptyState'
import { Toast } from '../../components/ui/Toast'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { t } from '../../i18n/ar'
import type { Transaction, Account, TransactionType } from '../../db/types'

export function TransactionsPage() {
  const filter = useUiStore((s) => s.filter)
  const setFilter = useUiStore((s) => s.setFilter)
  const initFilterAccount = useUiStore((s) => s.initFilterAccount)
  const [undoIds, setUndoIds] = useState<string[] | null>(null)

  // On first open, preselect the default account in the filter (once — a later
  // switch to "all accounts" or another account is preserved).
  const defaultAccountId = useLiveQuery(() => resolveDefaultAccountId(), [], undefined)
  useEffect(() => { if (defaultAccountId) initFilterAccount(defaultAccountId) }, [defaultAccountId, initFilterAccount])

  const result = useLiveQuery(async () => {
    const [txs, accounts, attachSet] = await Promise.all([queryTransactions(filter), listAccounts(), transactionIdsWithAttachments()])
    const accCur: Record<string, string> = {}
    const accName: Record<string, string> = {}
    for (const a of accounts) { accCur[a.id] = a.currency; accName[a.id] = a.name }
    return { txs, accCur, accName, accounts, attachSet }
  }, [JSON.stringify(filter)], { txs: [] as Transaction[], accCur: {} as Record<string, string>, accName: {} as Record<string, string>, accounts: [] as Account[], attachSet: new Set<string>() })
  const { txs, accCur, accName, accounts, attachSet } = result
  const summary = summarizeTransactions(txs, accCur)

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
      <SegmentedControl<TransactionType | ''>
        options={[
          { value: '', label: t('allTypes') },
          { value: 'expense', label: t('expense') },
          { value: 'income', label: t('income') },
          { value: 'transfer', label: t('transfer') },
        ]}
        value={filter.type ?? ''}
        onChange={(v) => setFilter({ type: v || undefined })}
      />
      {txs.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-surface p-3.5 shadow-soft">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-muted">{t('count')}</span>
            <span className="font-bold tabular-nums text-ink">{summary.count}</span>
          </div>
          {Object.entries(summary.byCurrency).map(([cur, tot]) => (
            <div key={cur} className="space-y-1 border-t border-line pt-2">
              <p className="text-[11px] font-bold text-muted">{cur}</p>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{t('income')}</span>
                <span className="tabular-nums text-income">{formatMoney(tot.income, cur)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">{t('expense')}</span>
                <span className="tabular-nums text-expense">{formatMoney(tot.expense, cur)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="font-semibold text-muted">{t('net')}</span>
                <span className={`font-semibold tabular-nums ${tot.net >= 0 ? 'text-income' : 'text-expense'}`}>{formatMoney(tot.net, cur)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
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
