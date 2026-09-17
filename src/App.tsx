import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/layout/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

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

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Report Routes */}
              <Route path="/reports" element={<ReportIndex />} />
              <Route path="/reports/create" element={<ReportCreate />} />
              <Route path="/reports/:uuid" element={<ReportShow />} />
              <Route path="/reports/:uuid/edit" element={<ReportEdit />} />

              {/* Account Routes */}
              <Route path="/accounts" element={<AccountIndex />} />
              <Route path="/accounts/create" element={<AccountCreate />} />
              <Route path="/accounts/:uuid" element={<AccountEdit />} />

              {/* Daily Report */}
              <Route path="/daily" element={<ReportDaily />} />

              {/* VSS Monitoring */}
              <Route path="/vss/monitor" element={<VSSMonitor />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;