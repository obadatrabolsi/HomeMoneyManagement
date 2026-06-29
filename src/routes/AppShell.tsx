import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { t } from '../i18n/ar'
import { Fab } from '../components/ui/Fab'
import { Sheet } from '../components/ui/Sheet'
import { TransactionForm } from '../features/transactions/TransactionForm'

const tabs = [
  { to: '/', label: t('dashboard') },
  { to: '/accounts', label: t('accounts') },
  { to: '/transactions', label: t('transactions') },
  { to: '/settings', label: t('settings') },
]

export function AppShell() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mx-auto min-h-screen max-w-md pb-16">
      <main className="p-4"><Outlet /></main>
      <Fab onClick={() => setOpen(true)}>＋</Fab>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <TransactionForm onDone={() => setOpen(false)} />
      </Sheet>
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md justify-around border-t bg-white py-2 dark:bg-gray-900">
        {tabs.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.to === '/'}
            className={({ isActive }) => `text-sm ${isActive ? 'font-bold text-emerald-600' : 'text-gray-500'}`}>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
