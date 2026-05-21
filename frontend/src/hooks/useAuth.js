import useAuthStore from '@/store/authStore';

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const initAuth = useAuthStore((s) => s.initAuth);

  return {
    token,
    user,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'admin',
    isCandidate: user?.role === 'candidate',
    login,
    logout,
    initAuth,
  };
}
