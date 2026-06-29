import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { t } from '../i18n/ar'
import { Fab } from '../components/ui/Fab'
import { Sheet } from '../components/ui/Sheet'
import { Icon, type IconName } from '../components/ui/Icon'
import { TransactionForm } from '../features/transactions/TransactionForm'

const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: t('dashboard'), icon: 'home' },
  { to: '/accounts', label: t('accounts'), icon: 'wallet' },
  { to: '/transactions', label: t('transactions'), icon: 'list' },
  { to: '/budgets', label: t('budgets'), icon: 'budget' },
  { to: '/settings', label: t('settings'), icon: 'settings' },
]

// Header title per route (covers tab and non-tab pages).
const titles: Record<string, string> = {
  '/': t('dashboard'),
  '/accounts': t('accounts'),
  '/transactions': t('transactions'),
  '/budgets': t('budgets'),
  '/settings': t('settings'),
  '/categories': t('categories'),
  '/goals': t('goals'),
  '/recurring': t('recurring'),
  '/debts': t('debts'),
  '/reports': t('reports'),
}

export function AppShell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const title = titles[pathname] ?? t('appName')

  return (
    <div className="mx-auto min-h-screen max-w-md bg-bg pb-24">
      <header className="sticky top-0 z-20 bg-bg/80 px-4 pb-2 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur-md">
        {isHome ? (
          <div>
            <p className="text-sm text-muted">{t('greeting')}</p>
            <h1 className="text-2xl font-extrabold text-ink">{t('appName')}</h1>
          </div>
        ) : (
          <h1 className="text-xl font-bold text-ink">{title}</h1>
        )}
      </header>

      <main className="px-4 pt-2">
        <Outlet />
      </main>

      <Fab onClick={() => setOpen(true)} />

      <Sheet open={open} onClose={() => setOpen(false)}>
        <TransactionForm onDone={() => setOpen(false)} />
      </Sheet>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md justify-around border-t border-line
        bg-surface/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-1 text-[11px] font-semibold transition
              ${isActive ? 'text-brand' : 'text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-9 w-12 items-center justify-center rounded-2xl transition
                    ${isActive ? 'bg-brand/10' : ''}`}
                >
                  <Icon name={tab.icon} size={22} />
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
