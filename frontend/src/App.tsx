import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { BatchManagementPage } from './pages/BatchManagementPage';
import { CustomerDirectoryPage } from './pages/CustomerDirectoryPage';
import { FinancePage } from './pages/FinancePage';
import { LoginPage } from './pages/LoginPage';
import { TechnicianPage } from './pages/TechnicianPage';
import { JobsQueuePage } from './pages/JobsQueuePage';

type PageType = 'dashboard' | 'customers' | 'jobs' | 'batches' | 'finance' | 'technician';

const getDefaultPageForRole = (role?: string): PageType => {
  if (role === 'TECHNICIAN') return 'technician';
  if (role === 'ADMINISTRATOR') return 'dashboard';
  return 'customers';
};

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const isTechnician = user?.role === 'TECHNICIAN';
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const defaultRoute = `/${getDefaultPageForRole(user?.role)}`;

  if (isTechnician) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Navbar />
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Routes>
            <Route path="/technician" element={<TechnicianPage />} />
            <Route path="*" element={<Navigate to="/technician" replace />} />
          </Routes>
        </main>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <Routes>
          {isAdmin && <Route path="/dashboard" element={<AdminDashboardPage />} />}
          <Route path="/jobs" element={<JobsQueuePage />} />
          <Route path="/customers" element={<CustomerDirectoryPage />} />
          {isAdmin && <Route path="/batches" element={<BatchManagementPage />} />}
          {isAdmin && <Route path="/finance" element={<FinancePage />} />}
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />
          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </main>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-ink-muted">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-brand-700/30 bg-surface-2/70 px-8 py-6 shadow-2xl shadow-surface/40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-500/30 border-t-brand-500" />
          <div className="text-center">
            <div className="text-sm font-semibold text-ink">Loading workspace session</div>
            <div className="text-xs text-ink-muted">Restoring your authenticated state...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <MainLayout />;
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
