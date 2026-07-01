import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listAccounts } from '../../db/accountsRepo'
import { listCategories } from '../../db/categoriesRepo'
import { createTransaction, createTransfer } from '../../db/transactionsRepo'
import { parseAmount } from '../../lib/money'
import { isoDate } from '../../lib/date'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SearchableSelect } from '../../components/ui/SearchableSelect'
import { t } from '../../i18n/ar'
import type { TransactionType } from '../../db/types'
import { compressImage, makeThumb } from '../../lib/image'
import { addAttachment } from '../../db/attachmentsRepo'

export function TransactionForm({ onDone }: { onDone: () => void }) {
  const [type, setType] = useState<TransactionType>('expense')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [toAccountId, setToAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  interface PendingImage { id: string; blob: Blob; thumb: Blob; url: string }
  const [images, setImages] = useState<PendingImage[]>([])
  const [imgBusy, setImgBusy] = useState(false)

  const accounts = useLiveQuery(() => listAccounts(), [], [])
  const categories = useLiveQuery(
    () => listCategories(type === 'income' ? 'income' : 'expense'),
    [type], [],
  )

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setImgBusy(true)
    try {
      for (const f of files) {
        try {
          const blob = await compressImage(f)
          const thumb = await makeThumb(f)
          setImages((prev) => [...prev, { id: crypto.randomUUID(), blob, thumb, url: URL.createObjectURL(thumb) }])
        } catch { setError(t('imageError')) }
      }
    } finally { setImgBusy(false) }
  }

  const removeImage = (imgId: string) => setImages((prev) => {
    const it = prev.find((p) => p.id === imgId)
    if (it) URL.revokeObjectURL(it.url)
    return prev.filter((p) => p.id !== imgId)
  })

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const cents = parseAmount(amount)
      if (!(cents > 0)) { setError('أدخل مبلغًا أكبر من صفر'); return }
      const date = isoDate(new Date())
      let attachTo: string | undefined
      if (type === 'transfer') {
        const r = await createTransfer({ fromAccountId: accountId, toAccountId, amount: cents, date })
        attachTo = r.outId
      } else {
        const created = await createTransaction({
          type, amount: cents, accountId,
          categoryId: categoryId || undefined,
          notes: notes.trim() || undefined,
          date,
        })
        attachTo = created.id
      }
      if (attachTo) {
        for (const img of images) {
          await addAttachment({ transactionId: attachTo, blob: img.blob, thumb: img.thumb, mime: 'image/jpeg' })
        }
      }
      images.forEach((i) => URL.revokeObjectURL(i.url))
      onDone()
    } catch (err) {
      const msg = (err as Error).message
      setError(msg === 'CURRENCY_MISMATCH' || msg === 'SAME_ACCOUNT' ? t('sameCurrencyOnly') : 'تعذّر الحفظ')
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <SegmentedControl<TransactionType>
        options={[
          { value: 'expense', label: t('expense') },
          { value: 'income', label: t('income') },
          { value: 'transfer', label: t('transfer') },
        ]}
        value={type}
        onChange={setType}
      />
      <Field label={t('amount')}>
        <input aria-label={t('amount')} className="input" inputMode="decimal"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      <Field label={type === 'transfer' ? t('from') : t('account')}>
        <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">—</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      {type === 'transfer' ? (
        <Field label={t('to')}>
          <select className="input" value={toAccountId} onChange={(e) => setToAccountId(e.target.value)}>
            <option value="">—</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      ) : (
        <>
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
        </>
      )}
      <Field label={t('attachments')}>
        <div className="flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.url} alt="مرفق" className="h-16 w-16 rounded-lg object-cover" />
              <button type="button" aria-label={t('deleteImage')} onClick={() => removeImage(img.id)}
                className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-expense text-xs text-white">×</button>
            </div>
          ))}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-ink">
            {imgBusy ? '…' : t('addImage')}
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} disabled={imgBusy} />
          </label>
        </div>
      </Field>
      {error && <p className="text-sm font-medium text-expense">{error}</p>}
      <Button type="submit" variant="primary" className="w-full">{t('save')}</Button>
    </form>
  )
}
