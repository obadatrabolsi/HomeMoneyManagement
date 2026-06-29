import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { createTransaction, createTransfer } from '../../db/transactionsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import type { TransactionType } from '../../db/types'

export function TransactionForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [error, setError] = useState('')

  const accounts = useLiveQuery(() => listAccounts(), [], [])
  const categories = useLiveQuery(
    () => listCategories(type === 'income' ? 'income' : 'expense'),
    [type], [],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      const date = isoDate(new Date())
      if (type === 'transfer') {
        await createTransfer({ fromAccountId: accountId, toAccountId, amount: cents, date })
      } else {
        await createTransaction({ type, amount: cents, accountId, categoryId: categoryId || undefined, date })
      }
      onDone()
    } catch (err) {
      const msg = (err as Error).message
      setError(msg === 'CURRENCY_MISMATCH' || msg === 'SAME_ACCOUNT' ? t('sameCurrencyOnly') : 'تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(['expense', 'income', 'transfer'] as TransactionType[]).map((ty) => (
          <Button key={ty} type="button" variant={type === ty ? 'primary' : 'ghost'} onClick={() => setType(ty)}>
            {t(ty)}
          </Button>
        ))}
      </div>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={type === 'transfer' ? t('from') : t('account')}>
        <select className="w-full rounded-lg border p-2" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      {type === 'transfer' ? (
        <Field label={t('to')}>
          <select className="w-full rounded-lg border p-2" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      ) : (
        <Field label={t('category')}>
          <select className="w-full rounded-lg border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">—</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
