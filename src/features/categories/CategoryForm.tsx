import { useState } from 'react'
import { createCategory } from '../../db/categoriesRepo'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'
import type { CategoryType } from '../../db/types'

export function CategoryForm({ type, onDone }: { type: CategoryType; onDone: () => void }) {
  const [name, setName] = useState('')
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createCategory({ name: name.trim(), type, icon: 'tag', color: '#64748b' })
    setName('')
    onDone()
  }
  return (
    <form onSubmit={submit} className="flex items-end gap-2">
      <Field label={t('name')}>
        <input className="w-full rounded-lg border p-2" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Button type="submit">{t('add')}</Button>
    </form>
  )
}
