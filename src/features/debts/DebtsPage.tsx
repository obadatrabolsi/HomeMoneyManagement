import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { debtsWithProgress, deleteDebt, remainingTotalsByDirection } from '../../db/debtsRepo'
import { formatMoney } from '../../lib/money'
import { DebtBar } from './DebtBar'
import { DebtForm } from './DebtForm'
import { PaymentForm } from './PaymentForm'
import { Button } from '../../components/ui/Button'
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
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">{t(dir)}</h2>
          <span className="text-xs text-gray-500">
            {Object.entries((data?.totals[dir]) ?? {}).map(([cur, amt]) => formatMoney(amt, cur)).join(' · ')}
          </span>
        </div>
        {items.length === 0 && <EmptyState message={t('noData')} />}
        {items.map((p) => (
          <div key={p.debt.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <span className="font-medium">{p.debt.person}</span>
              <div className="flex items-center gap-3">
                {p.settled && <span className="text-xs text-emerald-600">{t('settled')}</span>}
                <button aria-label={t('delete')} onClick={async () => { if (window.confirm('حذف هذا الدين؟')) await deleteDebt(p.debt.id) }}>🗑</button>
              </div>
            </div>
            <DebtBar percent={p.percent} settled={p.settled} />
            <div className="flex justify-between text-xs text-gray-500">
              <span>{t('paid')}: {formatMoney(p.paid, p.debt.currency)} / {formatMoney(p.debt.amount, p.debt.currency)} ({p.percent}%)</span>
              {p.debt.dueDate && <span>{t('dueDate')}: {p.debt.dueDate}</span>}
            </div>
            <Button variant="ghost" onClick={() => setPayTo(p.debt.id)}>{t('addPayment')}</Button>
          </div>
        ))}
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('debts')}</h1>
        <Button onClick={() => setAdding(true)}>{t('addDebt')}</Button>
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
