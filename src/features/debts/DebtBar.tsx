import { ProgressBar } from '../../components/ui/ProgressBar'

export function DebtBar({ percent, settled }: { percent: number; settled: boolean }) {
  return <ProgressBar percent={percent} tone={settled ? 'income' : 'warning'} />
}
