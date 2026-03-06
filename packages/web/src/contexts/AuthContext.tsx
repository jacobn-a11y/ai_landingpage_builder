import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { api, type AuthUser } from '@/lib/api';

type AuthState = {
  user: AuthUser | null;
  workspaceId: string | null;
  role: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: () => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  canEdit: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspaceId: null,
    role: null,
    loading: true,
  });

  const refetch = useCallback(async () => {
    try {
      const { user } = await api.auth.me();
      setState({
        user: user ?? null,
        workspaceId: user?.workspaceId ?? null,
        role: user?.role ?? null,
        loading: false,
      });
    } catch {
      setState({
        user: null,
        workspaceId: null,
        role: null,
        loading: false,
      });
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = useCallback(() => {
    window.location.href = '/api/v1/auth/google';
  }, []);

  const logout = useCallback(async () => {
    await api.auth.logout();
    setState({
      user: null,
      workspaceId: null,
      role: null,
      loading: false,
    });
    window.location.href = '/login';
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
    refetch,
    isAdmin: state.role === 'Admin',
    canEdit: state.role === 'Admin' || state.role === 'Editor',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
