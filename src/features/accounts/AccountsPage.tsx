import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { listAccounts, accountBalance, resolveDefaultAccountId } from '../../db/accountsRepo'
import { formatMoney } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { IconBadge } from '../../components/ui/IconBadge'
import { Icon } from '../../components/ui/Icon'
import { AccountForm } from './AccountForm'
import { t } from '../../i18n/ar'

export function AccountsPage() {
  const [open, setOpen] = useState(false)
  const data = useLiveQuery(async () => {
    const list = await listAccounts()
    const defaultId = await resolveDefaultAccountId()
    const accounts = await Promise.all(list.map(async (a) => ({ ...a, balance: await accountBalance(a.id) })))
    return { accounts, defaultId }
  }, [], { accounts: [], defaultId: undefined })
  const { accounts, defaultId } = data

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('accounts')}</h1>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          {t('add')}
        </Button>
      </div>
      {accounts.length === 0 && <EmptyState message={t('noData')} emoji="💳" />}
      {accounts.map((a) => (
        <Link
          key={a.id}
          to={`/accounts/${a.id}`}
          className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-soft"
        >
          <IconBadge icon={a.icon} color={a.color} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{a.name}</p>
              {a.id === defaultId && (
                <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-semibold text-brand">{t('isDefault')}</span>
              )}
            </div>
            <p className="text-xs text-muted">{a.currency}</p>
          </div>
          <span className="tabular-nums font-semibold text-ink">{formatMoney(a.balance, a.currency)}</span>
        </Link>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <AccountForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
