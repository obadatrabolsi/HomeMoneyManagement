import { softDeleteTransaction, toggleFavorite } from '../../db/transactionsRepo'
import { formatMoney } from '../../lib/money'
import type { Transaction } from '../../db/types'
import { t } from '../../i18n/ar'

const color: Record<Transaction['type'], string> = {
  income: 'text-emerald-600',
  expense: 'text-red-600',
  transfer: 'text-sky-600',
}

export function TransactionRow({ tx, currency = 'EUR', onDeleted }: { tx: Transaction; currency?: string; onDeleted?: (ids: string[]) => void }) {
  const sign = tx.type === 'expense' || (tx.type === 'transfer' && tx.transferDirection === 'out') ? '-' : '+'
  return (
    <div className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
      <div>
        <p className="font-medium">{tx.merchant || tx.notes || t(tx.type)}</p>
        <p className="text-xs text-gray-400">{tx.date}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`tabular-nums ${color[tx.type]}`}>{sign}{formatMoney(tx.amount, currency)}</span>
        <button aria-label="مفضلة" onClick={() => toggleFavorite(tx.id)}>{tx.isFavorite ? '★' : '☆'}</button>
        <button
          aria-label={t('delete')}
          onClick={() => {
            // Notify parent optimistically so UI can show undo toast immediately.
            // For simple transactions, [tx.id] is always the correct set.
            // softDeleteTransaction runs async to persist to DB; for transfer groups
            // both legs are soft-deleted together by the repo.
            onDeleted?.([tx.id])
            softDeleteTransaction(tx.id)
          }}
        >🗑</button>
      </div>
    </div>
  )
}
