import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import { LogOut, User, ShieldCheck, Sun, Moon, Briefcase, Users, Menu, X } from 'lucide-react';
import { BrandMark } from './BrandMark';
import maintecLogo from '../assets/maintec-logo.webp';

const NavbarComponent: React.FC = () => {
  const { user, logout } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isTechnician = user?.role === 'TECHNICIAN';
  const isAdmin = user?.role === 'ADMINISTRATOR';
  const isReceptionist = user?.role === 'RECEPTIONIST';

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    const initialTheme = storedTheme ?? (systemPrefersLight ? 'light' : 'dark');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'ADMINISTRATOR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'RECEPTIONIST':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'TECHNICIAN':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <header className="bg-surface-2/90 border-b border-brand-700/30 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-16 flex items-center justify-between gap-3 py-2">
          <BrandMark compact logoSrc={maintecLogo} />

          {user && !isTechnician && (
            <nav className="hidden md:flex items-center gap-1 mx-6">
              {isAdmin && (
                <NavLink
                  to="/dashboard"
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  Overview
                </NavLink>
              )}
              {isReceptionist && (
                <NavLink
                  to="/jobs"
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Briefcase className="w-4 h-4" />
                  Jobs Queue
                </NavLink>
              )}
              {isReceptionist && (
                <NavLink
                  to="/customers"
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Users className="w-4 h-4" />
                  Customers
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/batches"
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <ShieldCheck className="w-4 h-4" />
                  Batches
                </NavLink>
              )}
              {isAdmin && (
                <NavLink
                  to="/finance"
                  className={({ isActive }: { isActive: boolean }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40'
                    }`
                  }
                >
                  <Briefcase className="w-4 h-4" />
                  Finance
                </NavLink>
              )}
            </nav>
          )}

          {user && (
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-brand-700/30">
                <div className="w-8 h-8 rounded-full bg-surface-3 border border-brand-700/30 flex items-center justify-center text-ink-muted">
                  <User className="w-4 h-4" />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(user.role)} flex items-center gap-1`}>
                  <ShieldCheck className="w-3 h-3" />
                  {user.role}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((open) => !open)}
                className="md:hidden flex items-center justify-center rounded-lg p-2 text-ink-muted hover:bg-slate-800/60 hover:text-ink transition-colors"
                title={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center justify-center rounded-lg border border-transparent px-2.5 py-1.5 text-sm font-medium transition-colors"
                style={{ color: 'var(--text-muted)' }}
                title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                id="logout-btn"
                onClick={logout}
                className="flex items-center gap-2 text-ink-muted hover:text-rose-400 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-rose-500/10 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>

        {user && !isTechnician && isMobileMenuOpen && (
          <nav className="md:hidden border-t border-brand-700/30 py-3" aria-label="Mobile navigation">
            <div className="grid gap-1">
              {isAdmin && (
                <NavLink onClick={closeMobileMenu} to="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
                  <ShieldCheck className="w-4 h-4" /> Overview
                </NavLink>
              )}
              {isReceptionist && (
                <NavLink onClick={closeMobileMenu} to="/jobs" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
                  <Briefcase className="w-4 h-4" /> Jobs Queue
                </NavLink>
              )}
              {isReceptionist && (
                <NavLink onClick={closeMobileMenu} to="/customers" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
                  <Users className="w-4 h-4" /> Customers
                </NavLink>
              )}
              {isAdmin && (
                <NavLink onClick={closeMobileMenu} to="/batches" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
                  <ShieldCheck className="w-4 h-4" /> Batches
                </NavLink>
              )}
              {isAdmin && (
                <NavLink onClick={closeMobileMenu} to="/finance" className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800/60">
                  <Briefcase className="w-4 h-4" /> Finance
                </NavLink>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export const Navbar = React.memo(NavbarComponent);
