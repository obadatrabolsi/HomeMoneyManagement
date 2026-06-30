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

export function TransactionRow({ tx, currency, onDeleted, hasAttachment }: { tx: Transaction; currency: string; onDeleted?: (ids: string[]) => void; hasAttachment?: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const category = useLiveQuery(
    () => (tx.categoryId ? getCategory(tx.categoryId) : undefined),
    [tx.categoryId],
  )
  const sign = tx.type === 'expense' || (tx.type === 'transfer' && tx.transferDirection === 'out') ? '-' : '+'
  const b = badge[tx.type]
  const title = category?.name || tx.merchant || t(tx.type)
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft">
      {category ? <IconBadge icon={category.icon} color={category.color} /> : <IconBadge icon={b.icon} color={b.color} />}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-ink">{title}{hasAttachment && <span className="ml-1 text-muted">📎</span>}</p>
        {tx.notes && <p className="truncate text-xs text-muted">{tx.notes}</p>}
        <p className="text-xs text-muted">{tx.date}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`font-bold tabular-nums ${amountColor[tx.type]}`}>{sign}{formatMoney(tx.amount, currency)}</span>
        <button
          aria-label={t('edit')}
          onClick={() => setEditOpen(true)}
          className="text-muted transition hover:text-brand active:scale-90"
        >
          <Icon name="edit" size={18} />
        </button>
        <button
          aria-label="مفضلة"
          onClick={() => toggleFavorite(tx.id)}
          className={`transition active:scale-90 ${tx.isFavorite ? 'text-warning' : 'text-muted'}`}
        >
          <Icon name={tx.isFavorite ? 'star-filled' : 'star'} size={18} />
        </button>
        <button
          aria-label={t('delete')}
          className="text-muted transition hover:text-expense active:scale-90"
          onClick={async () => {
            const ids = await softDeleteTransaction(tx.id)
            onDeleted?.(ids)
          }}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>
      <EditTransactionSheet tx={tx} open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  )
}
