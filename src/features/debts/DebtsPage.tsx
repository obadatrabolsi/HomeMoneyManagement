import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { debtsWithProgress, deleteDebt, remainingTotalsByDirection } from '../../db/debtsRepo'
import { formatMoney } from '../../lib/money'
import { DebtBar } from './DebtBar'
import { DebtForm } from './DebtForm'
import { PaymentForm } from './PaymentForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'
import type { DebtDirection } from '../../db/types'

export function DebtsPage() {
  const [adding, setAdding] = useState(false)
  const [payTo, setPayTo] = useState<string | null>(null)
  const data = useLiveQuery(async () => {
    const progress = await debtsWithProgress()
    const totals = await remainingTotalsByDirection()
    return { progress, totals }
  }, [], undefined)

  const section = (dir: DebtDirection) => {
    const items = (data?.progress ?? []).filter((p) => p.debt.direction === dir)
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-bold text-ink">{t(dir)}</h2>
          <span className="text-xs tabular-nums text-muted">
            {Object.entries((data?.totals[dir]) ?? {}).map(([cur, amt]) => formatMoney(amt, cur)).join(' · ')}
          </span>
        </div>
        {items.length === 0 && <EmptyState message={t('noData')} emoji="🤝" />}
        {items.map((p) => (
          <div key={p.debt.id} className="space-y-3 rounded-3xl bg-surface p-4 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-ink">{p.debt.person}</span>
              <div className="flex items-center gap-3">
                {p.settled && <span className="text-xs font-semibold text-income">{t('settled')}</span>}
                <button
                  aria-label={t('delete')}
                  className="text-muted transition hover:text-expense"
                  onClick={async () => { if (window.confirm('حذف هذا الدين؟')) await deleteDebt(p.debt.id) }}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>
            <DebtBar percent={p.percent} settled={p.settled} />
            <div className="flex justify-between gap-3 text-xs text-muted">
              <span className="tabular-nums">{t('paid')}: {formatMoney(p.paid, p.debt.currency)} / {formatMoney(p.debt.amount, p.debt.currency)} ({p.percent}%)</span>
              {p.debt.dueDate && <span className="tabular-nums">{t('dueDate')}: {p.debt.dueDate}</span>}
            </div>
            <Button variant="soft" className="w-full" onClick={() => setPayTo(p.debt.id)}>
              <Icon name="plus" size={18} />
              {t('addPayment')}
            </Button>
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('debts')}</h1>
        <Button onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          {t('addDebt')}
        </Button>
      </div>
      {section('owe')}
      {section('owed')}
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <DebtForm onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={payTo !== null} onClose={() => setPayTo(null)}>
        {payTo && <PaymentForm debtId={payTo} onDone={() => setPayTo(null)} />}
      </Sheet>
    </div>
  )
}
