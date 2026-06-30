import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { updateTransactionOrGroup } from '../../db/transactionsRepo'
import { parseAmount, fromCents } from '../../lib/money'
import { Sheet } from '../../components/ui/Sheet'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { t } from '../../i18n/ar'
import type { Transaction } from '../../db/types'

export function EditTransactionSheet({
  tx,
  open,
  onClose,
}: {
  tx: Transaction
  open: boolean
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose}>
      {open && <EditForm tx={tx} onDone={onClose} />}
    </Sheet>
  )
}

function EditForm({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const isTransfer = tx.type === 'transfer'
  const [amount, setAmount] = useState(String(fromCents(tx.amount)))
  const [accountId, setAccountId] = useState(tx.accountId)
  const [categoryId, setCategoryId] = useState(tx.categoryId ?? '')
  const [notes, setNotes] = useState(tx.notes ?? '')
  const [date, setDate] = useState(tx.date)
  const [error, setError] = useState('')

  const accounts = useLiveQuery(() => listAccounts(), [], [])
  const categories = useLiveQuery(
    () => listCategories(tx.type === 'income' ? 'income' : 'expense'),
    [tx.type], [],
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      // Transfers share amount/date/notes across both legs; per-leg fields
      // (account/category) are only edited for income/expense.
      const patch: Partial<Transaction> = isTransfer
        ? { amount: cents, date, notes: notes.trim() || undefined }
        : { amount: cents, accountId, categoryId: categoryId || undefined, notes: notes.trim() || undefined, date }
      await updateTransactionOrGroup(tx.id, patch)
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{t('edit')}</h2>

      <Field label={t('amount')}>
        <input
          autoFocus
          className="input"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      {!isTransfer && (
        <>
          <Field label={t('account')}>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={t('category')}>
            <SearchableSelect
              options={categories.map((c) => ({ value: c.id, label: c.name, icon: c.icon }))}
              value={categoryId}
              onChange={setCategoryId}
            />
          </Field>
        </>
      )}

      <Field label={t('description')}>
        <textarea
          className="input min-h-[44px] resize-y"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>

      <Field label={t('date')}>
        <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
