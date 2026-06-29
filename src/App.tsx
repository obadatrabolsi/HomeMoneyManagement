import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './routes/AppShell'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AccountsPage } from './features/accounts/AccountsPage'
import { AccountDetailPage } from './features/accounts/AccountDetailPage'
import { TransactionsPage } from './features/transactions/TransactionsPage'
import { CategoriesPage } from './features/categories/CategoriesPage'
import { BackupPage } from './features/backup/BackupPage'
import { BudgetsPage } from './features/budgets/BudgetsPage'
import { GoalsPage } from './features/goals/GoalsPage'
import { RecurringPage } from './features/recurring/RecurringPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings" element={<BackupPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
