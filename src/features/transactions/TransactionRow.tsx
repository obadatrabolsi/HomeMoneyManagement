import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { softDeleteTransaction, toggleFavorite } from '../../db/transactionsRepo'
import { getCategory } from '../../db/categoriesRepo'
import { formatMoney } from '../../lib/money'
import type { Transaction } from '../../db/types'
import { IconBadge } from '../../components/ui/IconBadge'
import { Icon } from '../../components/ui/Icon'
import { EditTransactionSheet } from './EditTransactionSheet'
import { t } from '../../i18n/ar'

const amountColor: Record<Transaction['type'], string> = {
  income: 'text-income',
  expense: 'text-expense',
  transfer: 'text-transfer',
}

const badge: Record<Transaction['type'], { icon: string; color: string }> = {
  income: { icon: '↓', color: '#10B981' },
  expense: { icon: '↑', color: '#F43F5E' },
  transfer: { icon: '⇄', color: '#0EA5E9' },
}

export function TransactionRow({
  tx,
  currency,
  onDeleted,
  hasAttachment,
  accountName,
}: {
  tx: Transaction
  currency: string
  onDeleted?: (ids: string[]) => void
  hasAttachment?: boolean
  accountName?: string
}) {
  const [editOpen, setEditOpen] = useState(false)
  const category = useLiveQuery(
    () => (tx.categoryId ? getCategory(tx.categoryId) : undefined),
    [tx.categoryId],
  )
  const sign = tx.type === 'expense' || (tx.type === 'transfer' && tx.transferDirection === 'out') ? '-' : '+'
  const b = badge[tx.type]
  const title = category?.name || tx.merchant || t(tx.type)
  const openEdit = () => setEditOpen(true)

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      aria-label={t('edit')}
      onClick={openEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openEdit()
        }
      }}
      className="flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3 text-right shadow-soft transition active:scale-[0.99]"
    >
      {category ? <IconBadge icon={category.icon} color={category.color} /> : <IconBadge icon={b.icon} color={b.color} />}
      <div className="min-w-0 flex-1">
        <p className="break-words font-semibold text-ink">
          {title}
          {hasAttachment && <span className="mr-1 text-muted">📎</span>}
        </p>
        <p className="text-xs text-muted">
          {accountName && <span>{accountName} · </span>}
          {tx.date}
        </p>
        {tx.notes && <p className="mt-0.5 break-words text-xs text-muted">{tx.notes}</p>}
      </div>
      <div className="flex flex-col items-end gap-2">
        <span className={`whitespace-nowrap font-bold tabular-nums ${amountColor[tx.type]}`}>{sign}{formatMoney(tx.amount, currency)}</span>
        <div className="flex items-center gap-2">
          <button
            aria-label="مفضلة"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(tx.id) }}
            className={`transition active:scale-90 ${tx.isFavorite ? 'text-warning' : 'text-muted'}`}
          >
            <Icon name={tx.isFavorite ? 'star-filled' : 'star'} size={18} />
          </button>
          <button
            aria-label={t('delete')}
            className="text-muted transition hover:text-expense active:scale-90"
            onClick={async (e) => {
              e.stopPropagation()
              const ids = await softDeleteTransaction(tx.id)
              onDeleted?.(ids)
            }}
          >
            <Icon name="trash" size={18} />
          </button>
        </div>
      </div>
    </div>
    <EditTransactionSheet tx={tx} open={editOpen} onClose={() => setEditOpen(false)} />
    </>
  )
}
