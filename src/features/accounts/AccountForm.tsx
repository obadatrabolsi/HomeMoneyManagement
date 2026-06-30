import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import { parseAmount } from '../../lib/money'
import { createAccount } from '../../db/accountsRepo'
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currencies'

const schema = z.object({
  name: z.string().min(1),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]),
  color: z.string().min(1),
  initialBalance: z.string(),
})
type FormValues = z.infer<typeof schema>

export function AccountForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'SYP', color: '#10b981', initialBalance: '0' },
  })
  const onSubmit = async (v: FormValues) => {
    await createAccount({
      name: v.name, icon: '🏦', color: v.color, currency: v.currency,
      initialBalance: parseAmount(v.initialBalance || '0'),
    })
    onDone()
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('name')} error={errors.name && 'مطلوب'}>
        <input className="input" {...register('name')} />
      </Field>
      <Field label={t('currency')} error={errors.currency && 'مطلوب'}>
        <select className="input" {...register('currency')}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
          ))}
        </select>
      </Field>
      <Field label={t('initialBalance')}>
        <input className="input" inputMode="decimal" {...register('initialBalance')} />
      </Field>
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
