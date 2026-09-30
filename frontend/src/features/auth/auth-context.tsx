'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, setUnauthorizedHandler, tokenStore } from '@/lib/api';
import type { AuthResponse, AuthUser, Role } from '@/lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the stored token (if any) has been checked against the API. */
  loading: boolean;
  /** Set when a stored session could not be verified because the server was unreachable (not because it was rejected). */
  sessionError: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (role: 'talent' | 'promoter', payload: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function homeFor(role: Role) {
  return role === 'ADMIN' ? '/admin/dashboard' : role === 'PROMOTER' ? '/promoter/dashboard' : '/talent/dashboard';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setSessionError(null);
      return;
    }
    try {
      setUser(await api.get<AuthUser>('/auth/me'));
      setSessionError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        tokenStore.clear();
        setUser(null);
        setSessionError(null);
      } else {
        setSessionError(err instanceof ApiError ? err.message : 'We could not verify your session.');
      }
    }
  }, []);

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      tokenStore.clear();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const applySession = useCallback((res: AuthResponse) => {
    tokenStore.set(res.accessToken);
    setSessionError(null);
    setUser(res.user);
    return res.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => applySession(await api.post<AuthResponse>('/auth/login', { email, password }, { silent401: true })),
    [applySession],
  );

  const register = useCallback(
    async (role: 'talent' | 'promoter', payload: Record<string, unknown>) => applySession(await api.post<AuthResponse>(`/auth/register/${role}`, payload, { silent401: true })),
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* the local session is cleared regardless */
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, sessionError, login, register, logout, refresh }), [user, loading, sessionError, login, register, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
