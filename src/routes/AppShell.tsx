import { NavLink, Outlet } from 'react-router-dom'
import { t } from '../i18n/ar'

const tabs = [
  { to: '/', label: t('dashboard') },
  { to: '/accounts', label: t('accounts') },
  { to: '/transactions', label: t('transactions') },
  { to: '/settings', label: t('settings') },
]

export function AppShell() {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-16">
      <main className="p-4"><Outlet /></main>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t bg-white py-2 dark:bg-gray-900">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `text-sm ${isActive ? 'font-bold text-emerald-600' : 'text-gray-500'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
