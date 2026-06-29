import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { createRule } from '../../db/recurringRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { t } from '../../i18n/ar'
import type { RecurringFrequency } from '../../db/types'

const freqs: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly']

export function RecurringForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [merchant, setMerchant] = useState('')
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly')
  const [interval, setInterval] = useState('1')
  const [startDate, setStartDate] = useState(isoDate(new Date()))
  const [endDate, setEndDate] = useState('')
  const [error, setError] = useState('')

  const accounts = useLiveQuery(() => listAccounts(), [], [])
  const categories = useLiveQuery(() => listCategories(type), [type], [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!accountId) { setError('اختر حسابًا'); return }
    if (endDate && endDate < startDate) { setError('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'); return }
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      await createRule({
        type, amount: cents, accountId,
        categoryId: categoryId || undefined,
        merchant: merchant || undefined,
        frequency, interval: Math.max(1, Number(interval) || 1),
        startDate, endDate: endDate || undefined,
      })
      onDone()
    } catch {
      setError('تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <SegmentedControl
        options={[
          { value: 'expense', label: t('expense') },
          { value: 'income', label: t('income') },
        ]}
        value={type}
        onChange={(v) => setType(v as 'income' | 'expense')}
      />
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="input" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={t('account')}>
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <Field label={t('category')}>
        <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">—</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label={t('merchant')}>
        <input className="input" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </Field>
      <div className="flex gap-2">
        <Field label={t('every')}>
          <input className="input w-20" inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
        <Field label={t('frequency')}>
          <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
            {freqs.map((f) => <option key={f} value={f}>{t(f)}</option>)}
          </select>
        </Field>
      </div>
      <Field label={t('startDate')}>
        <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </Field>
      <Field label={t('endDate')}>
        <input type="date" className="input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </Field>
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
