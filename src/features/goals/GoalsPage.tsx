import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { goalsWithProgress, archiveGoal } from '../../db/goalsRepo'
import { formatMoney } from '../../lib/money'
import { GoalBar } from './GoalBar'
import { GoalForm } from './GoalForm'
import { ContributionForm } from './ContributionForm'
import { Button } from '../../components/ui/Button'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function GoalsPage() {
  const [adding, setAdding] = useState(false)
  const [contributeTo, setContributeTo] = useState<string | null>(null)
  const goals = useLiveQuery(() => goalsWithProgress(), [], [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('goals')}</h1>
        <Button onClick={() => setAdding(true)}>{t('addGoal')}</Button>
      </div>
      {goals.length === 0 && <EmptyState message={t('noData')} />}
      {goals.map((p) => (
        <div key={p.goal.id} className="space-y-2 rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <span className="font-medium" style={{ color: p.goal.color }}>{p.goal.name}</span>
            <div className="flex items-center gap-3">
              {p.reached && <span className="text-xs text-emerald-600">{t('reached')}</span>}
              <button aria-label={t('archive')} onClick={() => archiveGoal(p.goal.id)}>🗑</button>
            </div>
          </div>
          <GoalBar percent={p.percent} reached={p.reached} />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{t('current')}: {formatMoney(p.current, p.goal.currency)} / {formatMoney(p.goal.targetAmount, p.goal.currency)} ({p.percent}%)</span>
            {p.goal.targetDate && <span>{t('targetDate')}: {p.goal.targetDate}</span>}
          </div>
          <Button variant="ghost" onClick={() => setContributeTo(p.goal.id)}>{t('addContribution')}</Button>
        </div>
      ))}
      <Sheet open={adding} onClose={() => setAdding(false)}>
        <GoalForm onDone={() => setAdding(false)} />
      </Sheet>
      <Sheet open={contributeTo !== null} onClose={() => setContributeTo(null)}>
        {contributeTo && <ContributionForm goalId={contributeTo} onDone={() => setContributeTo(null)} />}
      </Sheet>
    </div>
  )
}
