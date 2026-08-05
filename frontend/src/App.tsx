import React, { useState, createContext, useContext } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CustomerDirectoryPage } from './pages/CustomerDirectoryPage';
import { LoginPage } from './pages/LoginPage';
import { TechnicianPage } from './pages/TechnicianPage';
import { JobsQueuePage } from './pages/JobsQueuePage';

export type PageType = 'customers' | 'jobs' | 'technician';

interface PageContextType {
  currentPage: PageType;
  setCurrentPage: (page: PageType) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const usePageNavigation = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageNavigation must be used within PageProvider');
  }
  return context;
};

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const { currentPage, setCurrentPage } = usePageNavigation();
  const isTechnician = user?.role === 'TECHNICIAN';

  // Technicians only see their work queue
  if (isTechnician) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <Navbar />
        <main className="flex-1">
          <TechnicianPage />
        </main>
      </div>
    );
  }

  // Receptionist and Admin can navigate between pages
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Navbar />
      <main className="flex-1">
        {currentPage === 'jobs' && <JobsQueuePage />}
        {currentPage === 'customers' && <CustomerDirectoryPage />}
      </main>
    </div>
  );
};

const AppShell: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageType>('customers');

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

  return isAuthenticated ? (
    <PageContext.Provider value={{ currentPage, setCurrentPage }}>
      <MainLayout />
    </PageContext.Provider>
  ) : (
    <LoginPage />
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
};

export default App;
