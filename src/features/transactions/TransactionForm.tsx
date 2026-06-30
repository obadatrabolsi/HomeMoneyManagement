import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { createTransaction, createTransfer } from '../../db/transactionsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { t } from '../../i18n/ar'
import type { TransactionType } from '../../db/types'

export function TransactionForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
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
        await createTransaction({
          type, amount: cents, accountId,
          categoryId: categoryId || undefined,
          notes: notes.trim() || undefined,
          date,
        })
      }
      onDone()
    } catch (err) {
      const msg = (err as Error).message
      setError(msg === 'CURRENCY_MISMATCH' || msg === 'SAME_ACCOUNT' ? t('sameCurrencyOnly') : 'تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <SegmentedControl<TransactionType>
        options={[
          { value: 'expense', label: t('expense') },
          { value: 'income', label: t('income') },
          { value: 'transfer', label: t('transfer') },
        ]}
        value={type}
        onChange={setType}
      />
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="input" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={type === 'transfer' ? t('from') : t('account')}>
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      {type === 'transfer' ? (
        <Field label={t('to')}>
          <select className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      ) : (
        <>
          <Field label={t('category')}>
            <SearchableSelect
              options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))}
              value={categoryId}
              onChange={setCategoryId}
            />
          </Field>
          <Field label={t('description')}>
            <textarea
              className="input min-h-[44px] resize-y"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>
        </>
      )}
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
