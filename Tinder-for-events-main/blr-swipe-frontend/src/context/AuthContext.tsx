import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api';
import type { UserType } from '../types';

interface AuthContextValue {
  user: UserType | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupData) => Promise<SignupResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

export interface SignupData {
  email: string;
  password: string;
  role: 'seeker' | 'lister';
  date_of_birth?: string;
  display_name?: string;
}

export interface SignupResult {
  user: UserType;
  ageRestricted?: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => ({ user: {} as UserType }),
  logout: async () => {},
  refresh: async () => {}
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await api.get('/api/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/api/auth/login', { email, password });
    setUser(res.data.user);
  };

  const signup = async (data: SignupData): Promise<SignupResult> => {
    const res = await api.post('/api/auth/signup', data);
    setUser(res.data.user);
    return { user: res.data.user };
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
