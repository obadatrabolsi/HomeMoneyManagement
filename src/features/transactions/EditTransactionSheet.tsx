import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { setTransactionAmount, updateTransaction } from '../../db/transactionsRepo'
import { parseAmount, fromCents } from '../../lib/money'
import { Sheet } from '../../components/ui/Sheet'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { t } from '../../i18n/ar'
import type { Transaction } from '../../db/types'

type Mode = 'choose' | 'amount' | 'details'

export function EditTransactionSheet({
  tx,
  open,
  onClose,
}: {
  tx: Transaction
  open: boolean
  onClose: () => void
}) {
  const [mode, setMode] = useState<Mode>('choose')

  // Reset to the chooser every time the sheet is opened.
  useEffect(() => {
    if (open) setMode('choose')
  }, [open])

  return (
    <Sheet open={open} onClose={onClose}>
      {mode === 'choose' && <Chooser type={tx.type} onPick={setMode} />}
      {mode === 'amount' && <AmountForm tx={tx} onDone={onClose} />}
      {mode === 'details' && <DetailsForm tx={tx} onDone={onClose} />}
    </Sheet>
  )
}

function Chooser({ type, onPick }: { type: Transaction['type']; onPick: (m: Mode) => void }) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{t('edit')}</h2>
      <Button variant="soft" className="w-full" onClick={() => onPick('amount')}>
        {t('editAmount')}
      </Button>
      {type !== 'transfer' && (
        <Button variant="soft" className="w-full" onClick={() => onPick('details')}>
          {t('editDetails')}
        </Button>
      )}
    </div>
  )
}

function AmountForm({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
  const [amount, setAmount] = useState(String(fromCents(tx.amount)))
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      await setTransactionAmount(tx.id, cents)
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{t('editAmount')}</h2>
      <Field label={t('amount')}>
        <input
          autoFocus
          className="input"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}

function DetailsForm({ tx, onDone }: { tx: Transaction; onDone: () => void }) {
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
      await updateTransaction(tx.id, {
        accountId,
        categoryId: categoryId || undefined,
        notes: notes.trim() || undefined,
        date,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-lg font-bold text-ink">{t('editDetails')}</h2>
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
