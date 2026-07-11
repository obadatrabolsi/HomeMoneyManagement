import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import { parseAmount } from '../../lib/money'
import { createAccount, setDefaultAccount } from '../../db/accountsRepo'
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currencies'

const schema = z.object({
  name: z.string().min(1),
  currency: z.enum(CURRENCY_CODES as [string, ...string[]]),
  color: z.string().min(1),
  initialBalance: z.string(),
  isDefault: z.boolean().optional(),
})
type FormValues = z.infer<typeof schema>

export function AccountForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'SYP', color: '#10b981', initialBalance: '0' },
  })
  const onSubmit = async (v: FormValues) => {
    const acc = await createAccount({
      name: v.name, icon: '🏦', color: v.color, currency: v.currency,
      initialBalance: parseAmount(v.initialBalance || '0'),
    })
    if (v.isDefault) await setDefaultAccount(acc.id)
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
      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input type="checkbox" className="h-4 w-4 accent-brand" {...register('isDefault')} />
        <span>{t('defaultAccount')}</span>
      </label>
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
