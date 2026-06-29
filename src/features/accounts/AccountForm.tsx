import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import { parseAmount } from '../../lib/money'
import { createAccount } from '../../db/accountsRepo'

const schema = z.object({
  name: z.string().min(1),
  currency: z.string().min(3).max(3),
  color: z.string().min(1),
  initialBalance: z.string(),
})
type FormValues = z.infer<typeof schema>

export function AccountForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currency: 'EUR', color: '#10b981', initialBalance: '0' },
  })
  const onSubmit = async (v: FormValues) => {
    await createAccount({
      name: v.name, icon: 'wallet', color: v.color, currency: v.currency.toUpperCase(),
      initialBalance: parseAmount(v.initialBalance || '0'),
    })
    onDone()
  }
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <Field label={t('name')} error={errors.name && 'مطلوب'}>
        <input className="w-full rounded-lg border p-2" {...register('name')} />
      </Field>
      <Field label={t('currency')} error={errors.currency && 'مطلوب'}>
        <input className="w-full rounded-lg border p-2" {...register('currency')} />
      </Field>
      <Field label={t('initialBalance')}>
        <input className="w-full rounded-lg border p-2" inputMode="decimal" {...register('initialBalance')} />
      </Field>
      <Button type="submit">{t('save')}</Button>
    </form>
  )
}
