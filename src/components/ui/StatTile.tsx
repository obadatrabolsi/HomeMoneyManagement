import { Icon, type IconName } from './Icon'

type Tone = 'income' | 'expense' | 'neutral'

const toneText: Record<Tone, string> = {
  income: 'text-income',
  expense: 'text-expense',
  neutral: 'text-ink',
}

const toneIcon: Record<Tone, IconName> = {
  income: 'arrow-up',
  expense: 'arrow-down',
  neutral: 'wallet',
}

export function StatTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: Tone
}) {
  return (
    <div className="rounded-2xl bg-surface p-3.5 shadow-soft">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted">
        <Icon name={toneIcon[tone]} size={14} className={tone === 'neutral' ? 'text-muted' : toneText[tone]} />
        <span>{label}</span>
      </div>
      <p className={`text-lg font-bold tabular-nums ${toneText[tone]}`}>{value}</p>
    </div>
  )
}
