import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listCategories } from '../../db/categoriesRepo'
import { getSettings } from '../../db/settingsRepo'
import { createBudget } from '../../db/budgetsRepo'
import { parseAmount } from '../../lib/money'
import { isoMonth } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

export function BudgetForm({ month, onDone }: { month?: string; onDone: () => void }) {
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const categories = useLiveQuery(() => listCategories('expense'), [], [])
  const settings = useLiveQuery(() => getSettings(), [], undefined)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (!categoryId) { setError('اختر تصنيفًا'); return }
      await createBudget({
        categoryId,
        month: month ?? isoMonth(new Date()),
        amount: parseAmount(amount),
        currency: settings?.defaultCurrency ?? 'EUR',
      })
      onDone()
    } catch (err) {
      setError((err as Error).message === 'DUPLICATE_BUDGET' ? t('duplicateBudget') : 'تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={t('category')}>
        <select className="w-full rounded-lg border p-2" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="w-full rounded-lg border p-2" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
