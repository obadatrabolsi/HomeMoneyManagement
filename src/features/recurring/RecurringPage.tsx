import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listRules, deleteRule, updateRule } from '../../db/recurringRepo'
import { formatMoney } from '../../lib/money'
import { RecurringForm } from './RecurringForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { Icon } from '../../components/ui/Icon'
import { t } from '../../i18n/ar'

export function RecurringPage() {
  const [open, setOpen] = useState(false)
  const rules = useLiveQuery(() => listRules(true), [], [])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('recurring')}</h1>
        <Button onClick={() => setOpen(true)}>
          <Icon name="plus" size={18} />
          {t('addRecurring')}
        </Button>
      </div>
      {rules.length === 0 && <EmptyState message={t('noData')} emoji="🔁" />}
      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.id} className="flex items-center justify-between rounded-2xl bg-surface p-3 shadow-soft">
            <div>
              <p className="font-medium text-ink">{r.merchant || t(r.type)}</p>
              <p className="text-xs text-muted">{t('every')} {r.interval} {t(r.frequency)} · {t('nextRun')}: {r.nextRunDate}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`font-semibold tabular-nums ${r.type === 'income' ? 'text-income' : 'text-expense'}`}>{formatMoney(r.amount, 'EUR')}</span>
              <button
                aria-label={t('active')}
                onClick={async () => { await updateRule(r.id, { isActive: !r.isActive }) }}
                className={`text-lg ${r.isActive ? 'text-income' : 'text-muted'}`}
              >
                {r.isActive ? '⏸' : '▶'}
              </button>
              <button
                aria-label={t('delete')}
                onClick={async () => { if (window.confirm('حذف هذه العملية المتكررة؟')) await deleteRule(r.id) }}
                className="text-muted hover:text-expense"
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <RecurringForm onDone={() => setOpen(false)} />
      </Sheet>
    </div>
  )
}
