import { formatMoney } from '../../lib/money'
import { Icon } from '../../components/ui/Icon'
import { t } from '../../i18n/ar'

export function BalanceCard({
  totals,
  monthNet,
}: {
  totals: Record<string, number>
  monthNet: Record<string, number>
}) {
  const entries = Object.entries(totals)
  const [primary, ...rest] = entries

  return (
    <section className="relative overflow-hidden rounded-4xl bg-grad-brand p-5 text-white shadow-brand">
      {/* glossy sheen */}
      <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative">
        <p className="text-sm font-medium text-white/80">{t('totalBalance')}</p>

        {primary ? (
          <>
            <p className="mt-1 text-4xl font-extrabold tabular-nums">
              {formatMoney(primary[1], primary[0])}
            </p>
            <MonthDelta net={monthNet[primary[0]]} currency={primary[0]} />
            {rest.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {rest.map(([cur, amt]) => (
                  <span
                    key={cur}
                    className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tabular-nums backdrop-blur-sm"
                  >
                    {formatMoney(amt, cur)}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="mt-2 text-2xl font-bold text-white/70">{t('noData')}</p>
        )}
      </div>
    </section>
  )
}

function MonthDelta({ net, currency }: { net?: number; currency: string }) {
  if (net === undefined || net === 0) return null
  const up = net > 0
  return (
    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-sm font-semibold tabular-nums backdrop-blur-sm">
      <Icon name={up ? 'arrow-up' : 'arrow-down'} size={15} />
      <span>{formatMoney(Math.abs(net), currency)}</span>
      <span className="text-white/70">{t('monthSummary')}</span>
    </div>
  )
}
