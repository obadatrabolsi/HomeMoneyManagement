import { ProgressBar } from '../../components/ui/ProgressBar'

export function GoalBar({ percent, reached }: { percent: number; reached: boolean }) {
  return <ProgressBar percent={percent} tone={reached ? 'income' : 'brand'} />
}
