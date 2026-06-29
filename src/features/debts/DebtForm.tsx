import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../db/settingsRepo'
import { createDebt } from '../../db/debtsRepo'
import { parseAmount } from '../../lib/money'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
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
      await createDebt({
        direction, person: person.trim(), amount: parseAmount(amount),
        currency: settings?.defaultCurrency ?? 'EUR',
        dueDate: dueDate || undefined, notes: notes || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        {(['owe', 'owed'] as DebtDirection[]).map((d) => (
          <Button key={d} type="button" variant={direction === d ? 'primary' : 'ghost'} onClick={() => setDirection(d)}>{t(d)}</Button>
        ))}
      </div>
      <Field label={t('person')}>
        <input className="w-full rounded-lg border p-2" value={person} onChange={(e) => setPerson(e.target.value)} />
      </Field>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('dueDate')}>
        <input type="date" className="w-full rounded-lg border p-2" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="w-full rounded-lg border p-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
