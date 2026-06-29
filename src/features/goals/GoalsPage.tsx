import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { goalsWithProgress, archiveGoal } from '../../db/goalsRepo'
import { formatMoney } from '../../lib/money'
import { GoalBar } from './GoalBar'
import { GoalForm } from './GoalForm'
import { ContributionForm } from './ContributionForm'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Sheet } from '../../components/ui/Sheet'
import { EmptyState } from '../../components/ui/EmptyState'
import { t } from '../../i18n/ar'

export function GoalsPage() {
  const [adding, setAdding] = useState(false)
  const [contributeTo, setContributeTo] = useState<string | null>(null)
  const goals = useLiveQuery(() => goalsWithProgress(), [], [])

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">{t('goals')}</h1>
        <Button onClick={() => setAdding(true)}>
          <Icon name="plus" size={18} />
          {t('addGoal')}
        </Button>
      </div>
      {goals.length === 0 && <EmptyState message={t('noData')} emoji="🎯" />}
      {goals.map((p) => (
        <div key={p.goal.id} className="space-y-3 rounded-3xl bg-surface p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-ink" style={{ color: p.goal.color }}>{p.goal.name}</span>
            <div className="flex items-center gap-3">
              {p.reached && <span className="text-xs font-semibold text-income">{t('reached')}</span>}
              <button
                aria-label={t('archive')}
                className="text-muted transition hover:text-expense"
                onClick={async () => { if (window.confirm('أرشفة هذا الهدف؟')) await archiveGoal(p.goal.id) }}
              >
                <Icon name="trash" size={18} />
              </button>
            </div>
          </div>
          <GoalBar percent={p.percent} reached={p.reached} />
          <div className="flex justify-between gap-3 text-xs text-muted">
            <span className="tabular-nums">{t('current')}: {formatMoney(p.current, p.goal.currency)} / {formatMoney(p.goal.targetAmount, p.goal.currency)} ({Math.max(p.percent, 0)}%)</span>
            {p.goal.targetDate && <span className="tabular-nums">{t('targetDate')}: {p.goal.targetDate}</span>}
          </div>
          <Button variant="soft" className="w-full" onClick={() => setContributeTo(p.goal.id)}>
            <Icon name="plus" size={18} />
            {t('addContribution')}
          </Button>
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
