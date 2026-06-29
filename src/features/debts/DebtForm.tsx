import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../db/settingsRepo'
import { createDebt } from '../../db/debtsRepo'
import { parseAmount } from '../../lib/money'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { t } from '../../i18n/ar'
import type { DebtDirection } from '../../db/types'

export function DebtForm({ onDone }: { onDone: () => void }) {
  const [direction, setDirection] = useState<DebtDirection>('owe')
  const [person, setPerson] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!person.trim()) { setError('اسم الشخص مطلوب'); return }
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      await createDebt({
        direction, person: person.trim(), amount: cents,
        currency: settings?.defaultCurrency ?? 'EUR',
        dueDate: dueDate || undefined, notes: notes || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <SegmentedControl<DebtDirection>
        options={(['owe', 'owed'] as DebtDirection[]).map((d) => ({ value: d, label: t(d) }))}
        value={direction}
        onChange={setDirection}
      />
      <Field label={t('person')}>
        <input className="input" value={person} onChange={(e) => setPerson(e.target.value)} />
      </Field>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('dueDate')}>
        <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
