import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { accountBalance, archiveAccount } from '../../db/accountsRepo'
import { queryTransactions } from '../../db/transactionsRepo'
import { formatMoney } from '../../lib/money'
import { Button } from '../../components/ui/Button'
import { IconBadge } from '../../components/ui/IconBadge'
import { TransactionRow } from '../transactions/TransactionRow'
import { t } from '../../i18n/ar'

export function AccountDetailPage() {
  const { id = '' } = useParams()
  const data = useLiveQuery(async () => {
    const account = await db.accounts.get(id)
    if (!account) return null
    const balance = await accountBalance(id)
    const txs = await queryTransactions({ accountId: id })
    return { account, balance, txs }
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
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-ink">{formatMoney(data.balance, data.account.currency)}</p>
        <Button variant="danger" className="mt-3" onClick={() => archiveAccount(id)}>{t('archive')}</Button>
      </div>
      <div className="space-y-3">
        {data.txs.map((tx) => <TransactionRow key={tx.id} tx={tx} currency={data.account.currency} />)}
      </div>
    </div>
  )
}
