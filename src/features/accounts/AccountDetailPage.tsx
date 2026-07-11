import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { accountBalance, archiveAccount, resolveDefaultAccountId, setDefaultAccount, updateAccount } from '../../db/accountsRepo'
import { queryTransactions } from '../../db/transactionsRepo'
import { formatMoney } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/IconBadge'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Sheet'
import { Field } from '../../components/ui/Field'
import { TransactionRow } from '../transactions/TransactionRow'
import { t } from '../../i18n/ar'
import type { Account } from '../../db/types'

export function AccountDetailPage() {
  const { id = '' } = useParams()
  const [editOpen, setEditOpen] = useState(false)
  const data = useLiveQuery(async () => {
    const account = await db.accounts.get(id)
    if (!account) return null
    const balance = await accountBalance(id)
    const txs = await queryTransactions({ accountId: id })
    const isDefault = (await resolveDefaultAccountId()) === id
    return { account, balance, txs, isDefault }
  }, [id], undefined)

  if (!data) return null
  return (
    <div className="animate-fade-in space-y-4">
      <div className="rounded-3xl bg-surface p-4 shadow-soft">
        <div className="flex items-center gap-3">
          <IconBadge icon={data.account.icon} color={data.account.color} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold text-ink">{data.account.name}</h1>
            <p className="text-xs text-muted">{data.account.currency}</p>
          </div>
          <button
            aria-label={t('edit')}
            onClick={() => setEditOpen(true)}
            className="shrink-0 rounded-full p-2 text-muted transition hover:bg-surface-2 hover:text-ink active:scale-90"
          >
            <Icon name="edit" size={20} />
          </button>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{formatMoney(data.balance, data.account.currency)}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.isDefault ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand">{t('defaultAccount')} ✓</span>
          ) : (
            <Button variant="soft" onClick={() => setDefaultAccount(id)}>{t('setAsDefault')}</Button>
          )}
          <Button variant="danger" onClick={() => archiveAccount(id)}>{t('archive')}</Button>
        </div>
      </div>
      <div className="space-y-3">
        {data.txs.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={data.account.currency} accountName={data.account.name} />)}
      </div>

      <Sheet open={editOpen} onClose={() => setEditOpen(false)}>
        {editOpen && <EditAccountForm account={data.account} onDone={() => setEditOpen(false)} />}
      </Sheet>
    </div>
  )
}

function EditAccountForm({ account, onDone }: { account: Account; onDone: () => void }) {
  const [name, setName] = useState(account.name)
  const [error, setError] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) { setError('مطلوب'); return }
    await updateAccount(account.id, { name: name.trim() })
    onDone()
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{t('edit')}</h2>
      <Field label={t('name')} error={error || undefined}>
        <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
