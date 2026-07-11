import { useLiveQuery } from 'dexie-react-hooks'
import { listPending, type SyncedTable, type PendingItem } from '../../db/syncTracking'
import { isSupabaseConfigured, getSupabase } from '../../db/supabase'
import { useSyncStore } from '../../stores/syncStore'
import { runSync } from '../../sync/service'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/ar'

const TABLE_LABELS: Record<SyncedTable, string> = {
  transactions: t('transactions'),
  accounts: t('accounts'),
  categories: t('categories'),
  budgets: t('budgets'),
  goals: t('goals'),
  goalContributions: t('goalContributions'),
  recurringRules: t('recurring'),
  debts: t('debts'),
  debtPayments: t('debtPayments'),
}

function itemLabel(item: PendingItem): string {
  const row = item.row as Record<string, unknown>
  if (row.deletedAt) return `🗑 ${String(row.id).slice(0, 8)}`
  switch (item.table) {
    case 'accounts':
    case 'categories':
    case 'goals':
      return String(row.name ?? '')
    case 'debts':
      return String(row.person ?? '')
    case 'transactions':
      return `${String(row.type ?? '')} · ${(Number(row.amount ?? 0) / 100).toFixed(2)}`
    default:
      return String(row.id).slice(0, 8)
  }
}

function StatusHeader() {
  const { status, lastSyncedAt, error } = useSyncStore()
  const label =
    status === 'syncing' ? t('syncing')
    : status === 'error' ? `${t('syncError')}: ${error ?? ''}`
    : status === 'offline' ? t('offlineStatus')
    : lastSyncedAt ? `${t('lastSync')}: ${new Date(lastSyncedAt).toLocaleString('ar')}`
    : ''
  return label ? <p className="text-xs text-muted">{label}</p> : null
}

export function SyncPage() {
  const pending = useLiveQuery(() => listPending(), [], [] as PendingItem[])
  const configured = isSupabaseConfigured()

  const groups = new Map<SyncedTable, PendingItem[]>()
  for (const item of pending) {
    const arr = groups.get(item.table) ?? []
    arr.push(item)
    groups.set(item.table, arr)
  }

  const signOut = () => { if (configured) void getSupabase().auth.signOut() }

  return (
    <div className="space-y-4 py-2">
      <section className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-ink">{t('cloudSync')}</h2>
            <StatusHeader />
          </div>
          <span data-testid="pending-count" className="text-2xl font-extrabold text-brand">
            {pending.length}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          {pending.length === 0 ? t('allSynced') : t('pendingItems')}
        </p>

        {configured ? (
          <div className="mt-3 flex gap-2">
            <Button className="flex-1" onClick={() => void runSync()}>{t('syncNow')}</Button>
            <Button className="flex-1" variant="ghost" onClick={signOut}>{t('logout')}</Button>
          </div>
        ) : (
          <p className="mt-3 rounded-lg bg-bg p-2 text-xs text-muted">{t('syncNotConfigured')}</p>
        )}
      </section>

      {[...groups.entries()].map(([table, items]) => (
        <section key={table} className="rounded-2xl border border-line bg-surface p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-ink">{TABLE_LABELS[table]}</h3>
            <span className="text-sm text-muted">{items.length}</span>
          </div>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-ink">{itemLabel(item)}</span>
                <span className="ms-2 shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-600">
                  {t('pendingSync')}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
