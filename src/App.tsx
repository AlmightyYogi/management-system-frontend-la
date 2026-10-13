import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import GuestGuard from './components/layout/GuestGuard';
import useAuthStore from './store/authStore';

import Login from './pages/auth/Login';

import Dashboard from './pages/dashboard/Dashboard';
import ReportIndex from './pages/report/ReportIndex';
import ReportCreate from './pages/report/ReportCreate';
import ReportShow from './pages/report/ReportShow';
import ReportEdit from './pages/report/ReportEdit';
import ReportDaily from './pages/report/ReportDaily';

import AccountIndex from './pages/account/AccountIndex';
import AccountCreate from './pages/account/AccountCreate';
import AccountEdit from './pages/account/AccountEdit';

import VSSMonitor from './pages/vss/VSSMonitor';

function isGuestUser(user: any): boolean {
  if (!user) return false;
  const name = String(user.role_name ?? user.role ?? '').toLowerCase();
  if (name === 'guest') return true;
  return Number(user.role_id) === 4;
}

function HomeRedirect() {
  const user = useAuthStore((s) => s.user);
  if (isGuestUser(user)) {
    return <Navigate to="/vss/monitor" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomeRedirect />} />

              <Route element={<GuestGuard allowGuest />}>
                <Route path="/vss/monitor" element={<VSSMonitor />} />
              </Route>

              <Route element={<GuestGuard allowGuest={false} />}>
                <Route path="/dashboard" element={<Dashboard />} />

                <Route path="/reports" element={<ReportIndex />} />
                <Route path="/reports/create" element={<ReportCreate />} />
                <Route path="/reports/:uuid" element={<ReportShow />} />
                <Route path="/reports/:uuid/edit" element={<ReportEdit />} />

                <Route path="/accounts" element={<AccountIndex />} />
                <Route path="/accounts/create" element={<AccountCreate />} />
                <Route path="/accounts/:uuid" element={<AccountEdit />} />

                <Route path="/daily" element={<ReportDaily />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;