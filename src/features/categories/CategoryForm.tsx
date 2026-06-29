import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { createCategory, listCategories } from '../../db/categoriesRepo'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { t } from '../../i18n/ar'
import type { CategoryType } from '../../db/types'

export function CategoryForm({ type, onDone }: { type: CategoryType; onDone: () => void }) {
  const [name, setName] = useState('')
  const [parentId, setParentId] = useState<string>('')
  const existingCats = useLiveQuery(() => listCategories(type), [type], [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await createCategory({
      name: name.trim(),
      type,
      icon: 'tag',
      color: '#64748b',
      ...(parentId ? { parentId } : {}),
    })
    setName('')
    setParentId('')
    onDone()
  }
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <Field label={t('name')}>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('category')}>
        <select
          className="input"
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
        >
          <option value="">— (تصنيف رئيسي) —</option>
          {existingCats.filter(c => !c.parentId).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>
      <Button type="submit">
        <Icon name="plus" size={18} />
        {t('add')}
      </Button>
    </form>
  )
}
