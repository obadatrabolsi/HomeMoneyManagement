import { useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { accountBalance, archiveAccount } from '../../db/accountsRepo'
import { queryTransactions } from '../../db/transactionsRepo'
import { formatMoney } from '../../lib/money'
import { Button } from '../../components/ui/Button'
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
    <div className="space-y-3">
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <h1 className="text-xl font-bold">{data.account.name}</h1>
        <p className="text-2xl tabular-nums">{formatMoney(data.balance, data.account.currency)}</p>
        <Button variant="danger" className="mt-2" onClick={() => archiveAccount(id)}>{t('archive')}</Button>
      </div>
      {data.txs.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}
    </div>
  )
}
