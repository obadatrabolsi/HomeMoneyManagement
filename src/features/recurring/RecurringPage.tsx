import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listRules, deleteRule, updateRule } from '../../db/recurringRepo'
import { formatMoney } from '../../lib/money'
import { RecurringForm } from './RecurringForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function RecurringPage() {
  const [open, setOpen] = useState(false)
  const rules = useLiveQuery(() => listRules(true), [], [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('recurring')}</h1>
        <Button onClick={() => setOpen(true)}>{t('addRecurring')}</Button>
      </div>
      {rules.length === 0 && <EmptyState message={t('noData')} />}
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div>
            <p className="font-medium">{r.merchant || t(r.type)}</p>
            <p className="text-xs text-gray-400">{t('every')} {r.interval} {t(r.frequency)} · {t('nextRun')}: {r.nextRunDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={r.type === 'income' ? 'text-emerald-600' : 'text-red-600'}>{formatMoney(r.amount, 'EUR')}</span>
            <button aria-label={t('active')} onClick={() => updateRule(r.id, { isActive: !r.isActive })}>{r.isActive ? '⏸' : '▶'}</button>
            <button aria-label={t('delete')} onClick={async () => { if (window.confirm('حذف هذه العملية المتكررة؟')) await deleteRule(r.id) }}>🗑</button>
          </div>
        </div>
      ))}
      <Sheet open={open} onClose={() => setOpen(false)}>
        <RecurringForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
