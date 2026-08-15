import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './components/dashboard/Dashboard';
import { Transactions } from './components/transactions/Transactions';
import { Subscriptions } from './components/subscriptions/Subscriptions';
import { Accounts } from './components/accounts/Accounts';
import { Settings } from './components/settings/Settings';
import { Housing } from './components/housing/Housing';
import { Debts } from './components/debts/Debts';
import { Calendar } from './components/calendar/Calendar';
import { PWAUpdatePrompt } from './components/ui/PWAUpdatePrompt';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AuthGuard>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/housing" element={<Housing />} />
                <Route path="/debts" element={<Debts />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <PWAUpdatePrompt />
        </AuthGuard>
      </DataProvider>
    </AuthProvider>
  );
}
