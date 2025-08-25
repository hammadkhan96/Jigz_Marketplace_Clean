import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check authentication status on mount
  const { data: authUser } = useQuery({
    queryKey: ['/api/auth/me'],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (authUser) {
      setUser(authUser as User);
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, [authUser]);

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      return apiRequest('POST', '/api/auth/login', { email, password });
    },
    onSuccess: (data: any) => {
      setUser(data.user);
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async ({ username, email, name, password }: { username: string; email: string; name: string; password: string }) => {
      return apiRequest('POST', '/api/auth/register', { username, email, name, password });
    },
    onSuccess: (data: any) => {
      setUser(data.user);
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/auth/logout', {});
    },
    onSuccess: () => {
      setUser(null);
      localStorage.removeItem('auth_token');
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email: email.toLowerCase(), password });
  };

  const register = async (username: string, email: string, name: string, password: string) => {
    await registerMutation.mutateAsync({ username, email: email.toLowerCase(), name, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}