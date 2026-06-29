import { ProgressBar, type ProgressTone } from '../../components/ui/ProgressBar'

const tone: Record<'ok' | 'near' | 'over', ProgressTone> = {
  ok: 'income',
  near: 'warning',
  over: 'expense',
}

export function BudgetBar({ percent, status }: { percent: number; status: 'ok' | 'near' | 'over' }) {
  return <ProgressBar percent={percent} tone={tone[status]} />
}
