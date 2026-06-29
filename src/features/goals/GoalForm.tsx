import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getSettings } from '../../db/settingsRepo'
import { createGoal } from '../../db/goalsRepo'
import { parseAmount } from '../../lib/money'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function GoalForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('الاسم مطلوب'); return }
    try {
      const cents = parseAmount(target || '0')
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      await createGoal({
        name: name.trim(),
        targetAmount: cents,
        currency: settings?.defaultCurrency ?? 'EUR',
        targetDate: targetDate || undefined,
        notes: notes || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label={t('name')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('targetAmount')}>
        <input aria-label={t('targetAmount')} className="input" inputMode="decimal"
          value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <Field label={t('targetDate')}>
        <input type="date" className="input" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
      </Field>
      <Field label={t('notes')}>
        <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
