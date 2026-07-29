import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AdminUser, AuthSession, Permission } from '../types';
import * as authService from '../services/authService';
import { recordAdminLogin } from '../data/store';
import { hasPermission as roleHasPermission } from '../config/roles';

interface AuthContextValue {
  session: AuthSession | null;
  user: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount.
  useEffect(() => {
    setSession(authService.getSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const next = await authService.login(email, password);
    recordAdminLogin(next.user.id);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setSession(null);
  }, []);

  const can = useCallback(
    (permission: Permission) => (session ? roleHasPermission(session.user.role, permission) : false),
    [session],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      loading,
      login,
      logout,
      can,
    }),
    [session, loading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
