import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { resolveSessionUser, type Role, type User } from '../lib/auth';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  hasRole: (roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!session?.access_token || !session.user) {
          setToken(null);
          setUser(null);
          return;
        }

        const resolvedUser = resolveSessionUser(session);
        const accessToken = session.access_token;

        setToken(accessToken);
        setUser(resolvedUser);
      } catch (error) {
        console.error('Failed to restore auth session', error);
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.access_token || !session.user) {
        setToken(null);
        setUser(null);
        return;
      }

      const resolvedUser = resolveSessionUser(session);
      setToken(session.access_token);
      setUser(resolvedUser);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Supabase sign-out failed', error);
    }

    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user && token),
      isLoading,
      login,
      logout,
      hasRole,
    }),
    [user, token, isLoading],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
