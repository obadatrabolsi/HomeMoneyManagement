import { useState } from 'react'
import { addContribution } from '../../db/goalsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function ContributionForm({ goalId, onDone }: { goalId: string; onDone: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await addContribution({ goalId, amount: parseAmount(amount), date: isoDate(new Date()), note: note || undefined })
      onDone()
    } catch {
      setError('مبلغ غير صالح')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="w-full rounded-lg border p-2" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
