import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { listAccounts, accountBalance } from '../../db/accountsRepo'
import { formatMoney } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { AccountForm } from './AccountForm'
import { t } from '../../i18n/ar'

export function AccountsPage() {
  const [open, setOpen] = useState(false)
  const accounts = useLiveQuery(async () => {
    const list = await listAccounts()
    return Promise.all(list.map(async (a) => ({ ...a, balance: await accountBalance(a.id) })))
  }, [], [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('accounts')}</h1>
        <Button onClick={() => setOpen(true)}>{t('add')}</Button>
      </div>
      {accounts.length === 0 && <EmptyState message={t('noData')} />}
      {accounts.map((a) => (
        <Link key={a.id} to={`/accounts/${a.id}`} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <span className="font-medium" style={{ color: a.color }}>{a.name}</span>
          <span className="tabular-nums">{formatMoney(a.balance, a.currency)}</span>
        </Link>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <AccountForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
